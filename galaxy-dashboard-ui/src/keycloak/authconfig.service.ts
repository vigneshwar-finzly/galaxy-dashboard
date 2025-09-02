import { Injectable, inject } from '@angular/core';
import { AuthConfig, NullValidationHandler, OAuthErrorEvent, OAuthService } from 'angular-oauth2-oidc';
 
import { filter } from 'rxjs/operators';
import { AuthTokenService } from '../auth/auth-token.service'; 
import { environment } from '../environments/environment';

 
@Injectable({ providedIn: 'root' })
export class AuthConfigService {
 
  private _decodedAccessToken: any;
  private _decodedIDToken: any;
  get decodedAccessToken() { return this._decodedAccessToken; }
  get decodedIDToken() { return this._decodedIDToken; }

  constructor(
    private readonly oauthService: OAuthService,
    private readonly authConfig: AuthConfig,
    private readonly authTokenService: AuthTokenService
  ) { }

  async initAuth(): Promise<any> {
    return new Promise<void>((resolveFn, rejectFn) => {

      console.log("First step")
      // Fetch issuer from ping API endpoint
      fetch(`https://${window.location.hostname}` + `/portal/ping`)
        .then(response => response.headers.get('issuer'))
        .then(issuer => {
          if (!issuer) {
            console.error('Issuer is null or undefined');
            rejectFn();
            return;
          }
          // Set issuer in authConfig
          this.authConfig.issuer = issuer;
          sessionStorage.setItem("issuer" , issuer);
          console.log(environment.keycloak.redirectUri)
          // Setup oauthService
          this.oauthService.configure(this.authConfig);
          this.oauthService.setStorage(sessionStorage);
          this.oauthService.tokenValidationHandler = new NullValidationHandler();

          localStorage.clear();

          // Subscribe to token events
          this.oauthService.events
            .pipe(filter((e: any) => {
              return e.type === 'token_received';
            }))
            .subscribe(() => this.handleNewToken());

          // Logout from portal on OAuthErrorEvent
          this.oauthService.events.subscribe(event => {
            console.log("oauthService event type", event.type)
            if (event instanceof OAuthErrorEvent) {
              localStorage.setItem('logout', Date.now().toString());
              this.oauthService.logOut();
            }
          });

          // Clear userInfo from sessionStorage
          sessionStorage.removeItem('userInfo');

          // Continue initializing app or redirect to login-page
          this.oauthService.loadDiscoveryDocumentAndLogin().then(isLoggedIn => {
            if (isLoggedIn) {
              this.oauthService.setupAutomaticSilentRefresh();
              // Store user info in session storage after successful login
              this.authTokenService.authorizeUser();
              resolveFn();
            } else {
              this.oauthService.initImplicitFlow();
              rejectFn();
            }
          });
        })
        .catch(error => {
          console.error('Error fetching issuer:', error);
          rejectFn();
        });
    });
  }

  private handleNewToken() {
    this._decodedAccessToken = this.oauthService.getAccessToken();
    this._decodedIDToken = this.oauthService.getIdToken();
  }

}