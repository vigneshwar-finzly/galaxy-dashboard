import { throwError as observableThrowError, Observable, of, throwError } from 'rxjs';
import { Injectable } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpErrorResponse,
} from '@angular/common/http';

import { map, catchError } from 'rxjs/operators';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
    constructor(private spinner: NgxSpinnerService) { }

    intercept(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        if (null !== this.getToken()) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${this.getToken()}`,
                },
            });
        }
        return next.handle(request).pipe(
            map((event: any) => {
                return event;
            }),
            catchError((error) => {
                console.log('error in common intercept');
                this.spinner.hide();
                let errorMessage = '';
                let handled = false;
                if (error instanceof HttpErrorResponse) {
                    if (error.error instanceof ErrorEvent) {
                        // client-side error
                        handled = true;
                        errorMessage = `${error.message}`;
                    } else {
                        // server-side error
                        switch (error.status) {
                            case 400:      // bad input parameters
                                handled = true;
                                errorMessage = `bad input parameter environment`;
                                break;
                            case 401:      // authorization
                                handled = true;
                                errorMessage = `You are not authorized to access the resource.`;
                                break;
                            case 403:     // forbidden
                                handled = true;
                                errorMessage = `Accessing the resource you were trying to reach is forbidden.`;
                                break;
                            case 404:     // not found
                                handled = true;
                                errorMessage = `The resource you were trying to reach is not found.`;
                                break;
                            case 500:     // Internal server error
                                handled = true;
                                errorMessage = `Internal server error.`;
                                break;
                            case 502:     // Bad Gateway
                                handled = true;
                                errorMessage = `Bad Gateway.`;
                                break;
                            case 503:     // Service unavailable
                                handled = true;
                                errorMessage = `Service unavailable.`;
                                break;
                        }
                    }
                }
                console.log('Error in common Interceptor', errorMessage)
                return throwError(error);
            })
        );
    }

    getToken() {
        return sessionStorage.getItem('access_token');
    }
}
