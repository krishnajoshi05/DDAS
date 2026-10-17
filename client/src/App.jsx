import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { Toaster }
from 'react-hot-toast';

import { ThemeProvider }
from './context/ThemeContext';

import { AppProvider }
from './context/AppContext';

import AppLayout
from './components/layout/AppLayout';

import PrivateRoute
from './components/PrivateRoute';

/* AUTH */

import Login
from './pages/Login';

import Register
from './pages/Register';

/* APP PAGES */

import Dashboard
from './pages/Dashboard';

import Upload
from './pages/Upload';

import Alerts
from './pages/Alerts';

import History
from './pages/History';

import Organization
from './pages/Organization';

export default function App() {

  return (

    <ThemeProvider>

      <AppProvider>

        <Router>

          <Toaster
            position="top-right"
          />

          <Routes>

            {/* AUTH ROUTES */}

            <Route
              path="/login"
              element={<Login />}
            />

            <Route
              path="/register"
              element={<Register />}
            />

            {/* PROTECTED APP */}

            <Route
              element={<PrivateRoute />}
            >

              <Route
                path="/"
                element={<AppLayout />}
              >

                <Route
                  index
                  element={
                    <Navigate
                      to="/dashboard"
                    />
                  }
                />

                <Route
                  path="/dashboard"
                  element={<Dashboard />}
                />

                <Route
                  path="/upload"
                  element={<Upload />}
                />

                <Route
                  path="/alerts"
                  element={<Alerts />}
                />

                <Route
                  path="/history"
                  element={<History />}
                />

                <Route
                  path="/organization"
                  element={<Organization />}
                />

              </Route>

            </Route>

          </Routes>

        </Router>

      </AppProvider>

    </ThemeProvider>

  );

}