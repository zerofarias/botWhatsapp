declare module '@root/greenlock-express' {
  interface GreenlockConfig {
    configDir?: string;
    staging?: boolean;
    maintainerEmail?: string;
    sites?: Array<{
      subject: string;
      altnames: string[];
    }>;
    renewAt?: number;
    store?: {
      module: string;
      basePath?: string;
    };
    challenges?: {
      'http-01'?: {
        module: string;
      };
    };
  }

  interface GreenlockInstance {
    serve(app: any): void;
    listen(port: number, callback?: () => void): void;
  }

  function init(config: GreenlockConfig): GreenlockInstance;

  export = { init };
}
