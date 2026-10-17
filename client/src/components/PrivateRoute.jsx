import {
  Navigate,
  Outlet
} from 'react-router-dom';

import {
  useAuth
} from '../context/AuthContext';

export default function PrivateRoute() {

  const {
    user,
    loading
  } = useAuth();

  /* LOADING */

  if (loading) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-white">

        <div className="glass-card px-8 py-6 flex items-center gap-3">

          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />

          <span>
            Loading...
          </span>

        </div>

      </div>

    );

  }

  /* NOT LOGGED IN */

  if (!user) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }

  /* AUTHORIZED */

  return <Outlet />;

}