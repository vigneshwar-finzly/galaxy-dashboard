import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  let token = sessionStorage.getItem('access_token');
  if (token) {
    req=req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
      }
    })
  }
  return next(req).pipe(
    catchError((error) => {
      return throwError(() => error)
    })
  );
};
