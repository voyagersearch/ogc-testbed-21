import { getBaseUrl } from '../config';

export const LoginInstructions = () => {
  const baseUrl = getBaseUrl();
  const voyagerLoginUrl = `${baseUrl}navigo/login`;
  const completeUrl = `${window.location.origin}/auth/complete`;

  const handleLoginClick = () => {
    window.location.href = voyagerLoginUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Voyager Login Instructions
        </h1>

        <div className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
            <p className="text-sm text-blue-900 font-medium">
              Please follow these steps to complete your login:
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <p className="text-gray-900 font-medium">Click the button below to log in to Voyager</p>
                <button
                  onClick={handleLoginClick}
                  className="mt-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Log in to Voyager
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <p className="text-gray-900 font-medium">Complete your login on the Voyager page</p>
                <p className="text-sm text-gray-600 mt-1">Enter your credentials and sign in</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium">
                3
              </div>
              <div className="flex-1">
                <p className="text-gray-900 font-medium mb-2">After logging in, paste this URL into your browser's address bar:</p>
                <div className="bg-gray-100 p-3 rounded border border-gray-300 font-mono text-sm break-all">
                  {completeUrl}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(completeUrl)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Copy URL
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Why these steps?</strong> Due to browser security restrictions,
              we cannot automatically capture your Voyager session. By navigating to
              the completion URL after logging in, we can securely establish your
              session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
