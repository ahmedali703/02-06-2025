import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
          {(process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") && (
            // eslint-disable-next-line @next/next/no-sync-scripts
            <script
              data-recording-token="VWW1o5C8xJl1CMaUi1NG92r92n8JhM9xH7vY1iS3"
              data-is-production-environment="false"
              src="https://snippet.meticulous.ai/v1/meticulous.js"
            />
          )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}