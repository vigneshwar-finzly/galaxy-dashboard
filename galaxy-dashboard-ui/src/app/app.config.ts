import { AuthTokenService } from '../auth/auth-token.service';
import { OAuthModuleConfig, authConfig } from './../keycloak/auth.config';
import { APP_INITIALIZER, ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { BrowserAnimationsModule, provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors} from '@angular/common/http';
import { init_app } from '../keycloak/auth.config.module';
import { AuthConfigService } from '../keycloak/authconfig.service';
import { AuthConfig,provideOAuthClient } from 'angular-oauth2-oidc';
import { provideToastr } from 'ngx-toastr';
// import { NgxSpinnerModule } from 'ngx-spinner';
import { httpInterceptor } from '../auth/http.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }),

    AuthConfigService, AuthTokenService,
    
     provideToastr(),
    { provide: AuthConfig, useValue: authConfig },
        OAuthModuleConfig,
        {
          provide: APP_INITIALIZER,
          useFactory: init_app,
          deps: [AuthConfigService],
          multi: true,
        },
    importProvidersFrom(
      // BrowserAnimationsModule,
      BrowserModule,
      // NgxSpinnerModule.forRoot()
    ),
     provideOAuthClient(),
     provideRouter(routes,withHashLocation()),
     provideClientHydration(),
     provideAnimations(),
     provideHttpClient(withInterceptors([httpInterceptor]))
     
    ]
};
