// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  apiUrl:'/dashboard-service',
  appCode : 'config',
  production: false,
  keycloak: {
    clientId: 'finzly.dashboard.ui',
    redirectUri: `https://${window.location.hostname}`+ `/dashboard-service`,
    issuer: `https://${window.location.host.split('-')[0]}-security${(window.location.host.split('-')[2].split('.')[0] ) ? ('-' + window.location.host.split('-')[2].split('.')[0]) : '' }.finzly.${getDomainExtension()}/auth/realms/BANKOS${((window.location.host.split('-')[2].split('.')[0] ) ? ('.' +window.location.host.split('-')[2].split('.')[0] ) : '' ).toUpperCase()}.${window.location.host.split('-')[0].toUpperCase()}.BANK`,
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
