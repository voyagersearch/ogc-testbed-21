import { getBaseUrl } from '../config';

export interface User {
  username: string;
  email?: string;
  name?: string;
  roles?: string[];
}

export const authService = {
  initializeSession: async () => {
    // No longer needed with direct navigo/login approach
    return Promise.resolve();
  },

  login: async () => {
    const loginUrl = `${window.location.origin}/auth/login`;
    console.log('Opening login instructions in popup:', loginUrl);

    const width = 900;
    const height = 700;
    const left = Math.round((window.screen.width - width) / 2);
    const top = Math.round((window.screen.height - height) / 2);

    const windowFeatures = `width=${width},height=${height},left=${left},top=${top},toolbar=yes,menubar=yes,location=yes,status=yes,scrollbars=yes,resizable=yes`;

    const popup = window.open(loginUrl, 'voyager_login', windowFeatures);

    if (!popup) {
      alert('Please allow popups for this site to log in');
      return;
    }

    popup.focus();

    return new Promise<void>((resolve) => {
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'VOYAGER_AUTH_SUCCESS') {
          console.log('Login successful!', event.data);
          window.removeEventListener('message', messageHandler);
          window.location.reload();
          resolve();
        } else if (event.data.type === 'VOYAGER_AUTH_ERROR') {
          console.error('Login failed:', event.data.error);
          window.removeEventListener('message', messageHandler);
          alert('Login failed. Please try again.');
          resolve();
        }
      };

      window.addEventListener('message', messageHandler);

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);

          authService.getAuthInfo().then(user => {
            if (user) {
              window.location.reload();
            }
          });

          resolve();
        }
      }, 500);
    });
  },

  handleCallback: async () => {
    console.log('Handling auth callback - verifying authentication...');

    const isPopup = window.opener && window.opener !== window;

    try {
      const baseUrl = getBaseUrl();
      const voyagerAuthUrl = `${baseUrl}api/rest/auth/info`;
      console.log('Checking Voyager auth status at:', voyagerAuthUrl);

      const authCheckResponse = await fetch(voyagerAuthUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!authCheckResponse.ok) {
        throw new Error('Failed to check Voyager authentication status');
      }

      const authData = await authCheckResponse.json();
      console.log('Voyager auth status:', authData);

      if (authData.state !== 'authenticated') {
        console.error('User is not authenticated with Voyager:', authData);
        throw new Error('Not authenticated with Voyager. Please complete the login process.');
      }

      const user = {
        username: authData.username || 'user',
        email: authData.email,
        name: authData.name || authData.displayName,
        roles: authData.roles || [],
      };

      console.log('Authentication successful!');

      if (isPopup && window.opener) {
        window.opener.postMessage(
          { type: 'VOYAGER_AUTH_SUCCESS', user },
          window.location.origin
        );
        await new Promise(resolve => setTimeout(resolve, 500));
        window.close();
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error verifying authentication:', error);

      if (isPopup && window.opener) {
        window.opener.postMessage(
          { type: 'VOYAGER_AUTH_ERROR', error: String(error) },
          window.location.origin
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.close();
      } else {
        alert('An error occurred. Please try again.');
        window.location.href = '/';
      }
    }
  },

  logout: async () => {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}api/rest/auth/logout`;
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  getAuthInfo: async (): Promise<User | null> => {
    try {
      console.log('Checking authentication status...');

      const baseUrl = getBaseUrl();
      const voyagerAuthUrl = `${baseUrl}api/rest/auth/info`;
      console.log('Checking Voyager auth at:', voyagerAuthUrl);

      const response = await fetch(voyagerAuthUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Auth response status:', response.status);

      if (!response.ok) {
        console.log('Auth check failed with status:', response.status);
        return null;
      }

      const authData = await response.json();
      console.log('Auth response data:', authData);

      if (authData.state === 'authenticated') {
        const user = {
          username: authData.username || 'user',
          email: authData.email,
          name: authData.name || authData.displayName,
          roles: authData.roles || [],
        };
        console.log('User is authenticated:', user);
        return user;
      }

      console.log('User is not authenticated');
      return null;
    } catch (error) {
      console.error('Auth info error:', error);
      return null;
    }
  },
};
