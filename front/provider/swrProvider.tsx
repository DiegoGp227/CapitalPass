"use client";

import apiClient from "@/src/shared/services/apiClient";
import { StoreProvider } from "easy-peasy";
import { createStore } from "easy-peasy";
import { ReactNode, useEffect, useState } from "react";
import { SWRConfig } from "swr";

const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);


const mockStore = createStore({});

export const SWRProvider = ({ children }: { children: ReactNode }) => {
  const [isClient, setIsClient] = useState(false);

  // Ensure StoreProvider is only used in the client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }
  return (
    <StoreProvider store={mockStore}>
      <SWRConfig
        value={{
          fetcher: fetcher,
          onError: (error: { status: number }) => {
            if (error.status !== 403 && error.status !== 404) {
              // We can send the error to Sentry,
              // or show a notification UI.
            }
          },
        }}
      >
        {children}
      </SWRConfig>
    </StoreProvider>
  );
};
