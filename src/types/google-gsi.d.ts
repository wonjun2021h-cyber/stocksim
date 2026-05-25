interface GoogleCredentialResponse {
  credential: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
          auto_select?: boolean;
        }) => void;
        renderButton: (
          parent: HTMLElement,
          options: Record<string, string | number | boolean>
        ) => void;
      };
    };
  };
}
