import { useEffect, useState } from 'react';

const VOYAGER_BASE_URL = 'https://ogc-sdi.voyagersearch.com';

export const LoginComplete = () => {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAndCapture = async () => {
      try {
        // First verify we're logged in to Voyager
        const authCheck = await fetch(`${VOYAGER_BASE_URL}/api/rest/auth/info`, {
          credentials: 'include',
        });

        const authData = await authCheck.json();
        console.log('Voyager auth status:', authData);

        if (authData.state === 'authenticated') {
          // Navigate to callback to capture the session
          window.location.href = '/auth/callback';
        } else {
          setChecking(false);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setChecking(false);
      }
    };

    checkAndCapture();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking login status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Login Not Detected
        </h2>
        <p className="text-gray-600 mb-4">
          Please complete the login on the Voyager page, then return here.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Check Again
        </button>
      </div>
    </div>
  );
};
