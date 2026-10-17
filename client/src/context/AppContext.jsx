import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import { filesAPI } from '../api';

const AppContext =
  createContext();

export function AppProvider({
  children
}) {

  const [files, setFiles] =
    useState([]);

  const [alerts, setAlerts] =
    useState([]);

  const [dashboard, setDashboard] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  /* LOAD FILES */

  const refreshFiles =
    async () => {

      try {

        const res =
          await filesAPI.getAll();

        const fetched =
          res.data.files || [];

        setFiles(fetched);

        /* DASHBOARD ANALYTICS */

        const totalFiles =
          fetched.length;

        const exactDuplicates =
          fetched.filter(
            f =>
              f.isDuplicate &&
              f.matchKind === 'exact'
          ).length;

        const nearDuplicates =
          fetched.filter(
            f =>
              f.matchKind === 'near'
          ).length;

        const partialDuplicates =
          fetched.filter(
            f =>
              f.matchKind === 'partial'
          ).length;

        const totalStorage =
          fetched.reduce(
            (a, b) =>
              a + (b.fileSize || 0),
            0
          );

        const storageSaved =
          fetched.reduce(
            (a, b) =>
              a + (b.storageSavedBytes || 0),
            0
          );

        const fileTypesMap = {};

        fetched.forEach(file => {

          const ext =
            file.mimeType ||
            'unknown';

          fileTypesMap[ext] =
            (fileTypesMap[ext] || 0) + 1;

        });

        const fileTypes =
          Object.entries(fileTypesMap)
            .map(([type,count])=>({

              type,

              count

            }));

        setDashboard({

          totalFiles,

          exactDuplicates,

          nearDuplicates,

          partialDuplicates,

          totalStorage,

          storageSaved,

          duplicatePercentage:
            totalFiles
              ? Math.round(
                  (
                    exactDuplicates /
                    totalFiles
                  ) * 100
                )
              : 0,

          fileTypes

        });

      } catch (err) {

        console.error(err);

      } finally {

        setLoading(false);

      }

    };

  /* LOAD ALERTS */

  const refreshAlerts =
    async () => {

      try {

        const res =
          await filesAPI.getAlerts();

        setAlerts(
          res.data.alerts || []
        );

      } catch (err) {

        console.error(err);

      }

    };

  /* INITIAL LOAD */

  useEffect(() => {

    Promise.all([
      refreshFiles(),
      refreshAlerts()
    ]);

  }, []);

  /* REAL-TIME ANALYTICS */

  const analytics =
    useMemo(() => {

      const duplicates =
        files.filter(
          f => f.isDuplicate
        );

      const similarityAvg =
        duplicates.length
          ? Math.round(

              duplicates.reduce(
                (a,b)=>
                  a +
                  (
                    b.similarityScore || 0
                  ),
                0
              ) / duplicates.length

            )
          : 0;

      return {

        similarityAvg,

        recentUploads:
          [...files]
            .sort(
              (a,b)=>

                new Date(b.createdAt) -
                new Date(a.createdAt)

            )
            .slice(0,5)

      };

    }, [files]);

  return (

    <AppContext.Provider
      value={{

        files,

        alerts,

        dashboard,

        analytics,

        loading,

        refreshFiles,

        refreshAlerts,

        setFiles,

        setAlerts

      }}
    >

      {children}

    </AppContext.Provider>

  );

}

export function useApp() {

  return useContext(AppContext);

}