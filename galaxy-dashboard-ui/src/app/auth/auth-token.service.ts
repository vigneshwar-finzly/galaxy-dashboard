import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import { rejects } from 'assert';

@Injectable({
  providedIn: 'root'
})
export class AuthTokenService {

  private readonly JWT_TOKEN = 'JWT_TOKEN';

  private readonly REFRESH_TOKEN = 'REFRESH_TOKEN';
  private readonly ACCESS_TOKEN = 'ACCESS_TOKEN';
  private readonly ISS = 'ISS';

  jwtHelper = new JwtHelperService();

  //keep portal only for all F2 apps. 
  //IFrame apps needs to  be tested.
  client = 'finzly.portal'
  url = "/portal/app-token";
  refesh_url = "/portal/refresh-token";

  constructor(private http: HttpClient) { }

  logout() {
    this.doLogoutUser();

    // only for portal 
    // window.location.href = "./app-logout";
  }
  isLoggedIn() {
    return !!this.getKCRefreshToken();
  }

  private doLogoutUser() {
    this.removeTokens();
    this.removeRefreshTokens();
  }

  private removeTokens() { //to support old app for now . to be removed
    localStorage.removeItem(this.JWT_TOKEN);
    sessionStorage.clear();
  }

  async refreshTokenAppServer() {
    console.log("Staticdata :Staticdata :refreshTokenAppServer")

    const headers = new HttpHeaders();
    const res = await this.http.get<any>(this.refesh_url, { headers }).toPromise()
    console.log("Staticdata :Staticdata :Data: " + JSON.stringify(res));

    if (res) {
      this.storeAppServerRefreshToken(res);
      console.log("Staticdata :res : " + res);
      console.log("Staticdata :res.iss : " + res.iss);
      console.log("Staticdata :res.refresh_token : " + res.refresh_token);
      await this.getAccessTokenFromKC();
    }
    return true;
  }

  private storeAppServerRefreshToken(res) {
    console.log("Staticdata :storeAppServerRefreshToken : " + res);
    this.client = res.client;
    localStorage.setItem(this.REFRESH_TOKEN, res.refresh_token);
    localStorage.setItem(this.ISS, res.iss);

  }
  private removeRefreshTokens() {
    console.log("Staticdata :removeRefreshTokens");
    this.removeKCRefreshToken();
    this.removeKCAccessToken();
    this.removeKCIssuer();
    localStorage.clear();
    sessionStorage.clear();
  }

  getAccessTokenFromKC() {

    return new Promise(async resolve => {

      console.log("Staticdata :getAccessTokenFromKC")
      const headers = new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      })

      const isRefTokenExpired = this.isRefreshTokenExpired();//this.helper.isTokenExpired(serverToken);
      if (isRefTokenExpired) {
        console.log("Staticdata :refresh token expired");
        console.log("Staticdata :before postmessage logout location.origin; " + location.origin);
        window.postMessage({ for: "login", data: 'sessiontimeout' }, location.origin);
        console.log("Staticdata :after postmessage ");

        this.logout();
        console.log("Staticdata :sending reject");

        rejects(function () { });
      } else {

        var serverToken: any = this.getKCRefreshToken();
        console.log("Staticdata :refresh token is  valid")
        var iss: any = localStorage.getItem(this.ISS);

        var kcUrl = iss + "/protocol/openid-connect/token";

        var body = 'grant_type=refresh_token&client_id='
          + this.client + '&refresh_token='
          + serverToken;

        console.log("Staticdata :kcUrl " + kcUrl);
        //console.log("Staticdata :body " + body);
        const data = await this.http.post(kcUrl, body, { headers }).toPromise();

        resolve(data);
      }
    });
  }

  checkAndGetAccessToken() {

    return new Promise(async resolve => {

      console.log("Staticdata :checkAndGetAccessToken")
      const isExpired = this.isAccessTokenExpired();

      if (isExpired) {
        console.log("Staticdata :access token expired");
        this.removeKCAccessToken();

        const data = await this.getAccessTokenFromKC();
        console.log("Staticdata data =" + data);
        if (data) {
          this.storeKCServerRefreshToken(data)
          resolve(data['access_token']);
        } else {
          //rejects();
          rejects(function () { });
        }


      } else {
        console.log("Staticdata :Use existing access token ");
        var tokenObj: any = this.getKCAccessToken();
        resolve(tokenObj);
      }

    });
  }

  private storeKCServerRefreshToken(res) {
    console.log("Staticdata :storeKCServerRefreshToken access_token: " + res.access_token);
    console.log("Staticdata :storeKCServerRefreshToken refresh_token: " + res.refresh_token);

    localStorage.setItem(this.ACCESS_TOKEN, res.access_token);
    localStorage.setItem(this.REFRESH_TOKEN, res.refresh_token);
  }

  getKCRefreshToken() {
    return localStorage.getItem(this.REFRESH_TOKEN);
  }
  getKCAccessToken() {
    return localStorage.getItem(this.ACCESS_TOKEN);
  }
  isAccessTokenExpired() {
    return this.jwtHelper.isTokenExpired(this.getKCAccessToken());
  }
  isRefreshTokenExpired() {
    return this.jwtHelper.isTokenExpired(this.getKCRefreshToken());
  }
  removeKCAccessToken() {
    localStorage.removeItem(this.ACCESS_TOKEN);
  }
  removeKCRefreshToken() {
    localStorage.removeItem(this.REFRESH_TOKEN);
  }
  removeKCIssuer() {
    localStorage.removeItem(this.ISS);
  }
  getUserFromToken() {
    const token = localStorage.getItem(this.ACCESS_TOKEN);;
    var tokenObj = this.jwtHelper.decodeToken(token);
    var user;
    //user.id=tokenObj.;
    if (tokenObj) {
      user.firstName = tokenObj.given_name;
      user.lastName = tokenObj.family_name;
      user.loginId = tokenObj.sub;
      user.email = tokenObj.email;
      user.loginId = tokenObj.userName; //TODO remove
      user.username = tokenObj.username;
    }

    return user;
  }
}