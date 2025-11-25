// Fix: Cannot find type definition file for 'vite/client'.
// Fix: Cannot redeclare block-scoped variable 'process'.

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}
