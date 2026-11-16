import Script from 'next/script';

const GA_ID = 'G-HKC0X9FC67';

export function GoogleAnalytics() {
  return (
    <>
      <Script id="ilmvers-ga4" strategy="beforeInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'granted'});gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="beforeInteractive" />
    </>
  );
}
