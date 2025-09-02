import { environment } from '../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { catchError, mapTo, tap } from 'rxjs/operators';
import { OAuthService } from 'angular-oauth2-oidc';


@Injectable({
  providedIn: 'root'
})
export class AuthTokenService {

  private readonly JWT_TOKEN = 'JWT_TOKEN';
  url = "/portal/app-token"
  public username: any;
  // //url = "/message-hub/k_query_bearer_token";
  entitlements:any = [];
  public loadHomePage: boolean = false;
  userId: any;
  isAuthenticated: boolean=false;

  constructor(private http: HttpClient, private readonly oauthService: OAuthService) {
   }

  // currently not in use, but need to remove tokens on logout
  logout() {
    return this.http.post<any>(`./app-logout`, {}).pipe(
      tap(() => this.doLogoutUser()),
      mapTo(true),
      catchError(error => {
        alert(error.error);
        return of(false);
      }));
  }

  isLoggedIn() {
    return !!this.getJwtToken();
  }

  refreshToken() {
    // return this.http.get<any>(this.url).pipe(tap((res) => {
    //   this.storeJwtToken(res["access_token"]);
    // }));

    const headers = new HttpHeaders();

    return this.http.get<any>(this.url,{headers}).pipe(tap((res) => {
      this.storeJwtToken(res.access_token);
    }));
  }

  retrieveEntitlements() {
    return new Promise((resolve, reject) => {
      let authoroties = this.http.get(this.getAuthoritiesUrl());
      authoroties.toPromise().then(
        (entitlements: any) => {
        if (entitlements && entitlements.length != 0) {
          this.entitlements = entitlements;
          this.loadHomePage = true;
          resolve(this.entitlements);
        } else {
          window.location.href = '/portal';
          this.loadHomePage = false;
          resolve(this.entitlements);
        }
        console.log("entitlements are: ", this.entitlements);
      });
    });
  }
  private getAuthoritiesUrl() {
    return "/portal/authorities";
  }

  /*
    hasEntitlement() => verify the given entitlement with user's entitlement
  */
  hasEntitlement(entitlement:any) {
    if (this.entitlements.includes(entitlement)) {
      return true;
    }
    return false;
  }

  async authorizeUser() {
    const sessionUserInfo = JSON.parse(sessionStorage.getItem('userInfo') as string);
  
    if (sessionUserInfo) {
  
      this.userId =  sessionUserInfo.username;
      this.isAuthenticated = true;
      localStorage.setItem("userId", this.userId);
    
    } else {
      let userInfo = this.http.get(this.getUserInfoURL());
      userInfo.subscribe((data: any) => {
        if (data) {
          this.username = data.loginId;
          sessionStorage["userInfo"] = JSON.stringify(data);
        } else {
          window.location.href = '/portal';
        }
      }, error => {
        //window.location.href = '/portal';
      });
    }
  
  }
  public getUserInfoURL() {
    return "/portal/user-info";
  }

  getJwtToken() {
    return localStorage.getItem(this.JWT_TOKEN);
  }

  private doLogoutUser() {
    this.removeTokens();
  }

  private storeJwtToken(jwt: string) {
    localStorage.setItem(this.JWT_TOKEN, jwt);
  }

  private removeTokens() {
    localStorage.removeItem(this.JWT_TOKEN);
  }
  
  retrieveEntitlementsFromToken() {
    const token: string|null = (environment.production)?sessionStorage.getItem('access_token'):localStorage.getItem('access_token');
    const parsedToken = this.parseJwtToken(token);
    if (parsedToken && parsedToken.resource_access[environment.appCode]) {
      this.entitlements = parsedToken.resource_access[environment.appCode].roles;
    }
  }

  // Function to parse JWT token
  parseJwtToken(token:any) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }
}