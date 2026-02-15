import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { LoginPage, RegisterPage } from './components/Auth';
import { ToastContainer } from './components/ToastContainer';
import { useAuthStore } from './store/authStore';

function App() {
  const { isAuthenticated, initAuth } = useAuthStore();
  const [authPage, setAuthPage] = useState<'login' | 'register'>('login');

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (!isAuthenticated) {
    return (
      <>
        <ToastContainer />
        {authPage === 'login' ? (
          <LoginPage onSwitchToRegister={() => setAuthPage('register')} />
        ) : (
          <RegisterPage onSwitchToLogin={() => setAuthPage('login')} />
        )}
      </>
    );
  }

  return (
    <>
      <ToastContainer />
      <Layout />
    </>
  );
}

export default App;
