import { EchoHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    echo: EchoHandler;
  }
}

export {};
