export const environment = {
  apiUrl:'/dashboard-service',
  appCode : 'config',
  production: true,
  keycloak: {
    clientId: 'finzly.dashboard.ui',
    redirectUri: `https://${window.location.hostname}`+ `/dashboard-service`,
    issuer: sessionStorage.getItem('issuer'),
    responseType: 'code',
    scope: 'openid profile email',
    requireHttps: true,
    showDebugInformation: true,
    disableAtHashCheck: true,
  }
};

function getDomainExtension(){
  let extension;
  extension = window.location.host.split('.')[2];
  return extension;
}
