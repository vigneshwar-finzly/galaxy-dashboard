import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AnimationState {
  isAnimating: boolean;
  currentAnimation: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AnimationService {
  private animationState = new BehaviorSubject<AnimationState>({
    isAnimating: false,
    currentAnimation: null
  });

  private readonly defaultDuration = 400;
  private readonly easing = 'cubic-bezier(0.4, 0, 0.2, 1)';

  constructor() {}

  getAnimationState(): Observable<AnimationState> {
    return this.animationState.asObservable();
  }

  // Fade in animation
  fadeIn(element: HTMLElement, duration: number = this.defaultDuration): Promise<void> {
    return new Promise((resolve) => {
      this.animationState.next({
        isAnimating: true,
        currentAnimation: 'fadeIn'
      });

      element.style.opacity = '0';
      element.style.transform = 'translateY(20px)';
      element.style.transition = `all ${duration}ms ${this.easing}`;

      // Force reflow
      element.offsetHeight;

      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';

      setTimeout(() => {
        this.animationState.next({
          isAnimating: false,
          currentAnimation: null
        });
        resolve();
      }, duration);
    });
  }

  // Scale in animation
  scaleIn(element: HTMLElement, duration: number = this.defaultDuration): Promise<void> {
    return new Promise((resolve) => {
      this.animationState.next({
        isAnimating: true,
        currentAnimation: 'scaleIn'
      });

      element.style.opacity = '0';
      element.style.transform = 'scale(0.95)';
      element.style.transition = `all ${duration}ms ${this.easing}`;

      // Force reflow
      element.offsetHeight;

      element.style.opacity = '1';
      element.style.transform = 'scale(1)';

      setTimeout(() => {
        this.animationState.next({
          isAnimating: false,
          currentAnimation: null
        });
        resolve();
      }, duration);
    });
  }

  // Slide in from left
  slideInLeft(element: HTMLElement, duration: number = this.defaultDuration): Promise<void> {
    return new Promise((resolve) => {
      this.animationState.next({
        isAnimating: true,
        currentAnimation: 'slideInLeft'
      });

      element.style.opacity = '0';
      element.style.transform = 'translateX(-30px)';
      element.style.transition = `all ${duration}ms ${this.easing}`;

      // Force reflow
      element.offsetHeight;

      element.style.opacity = '1';
      element.style.transform = 'translateX(0)';

      setTimeout(() => {
        this.animationState.next({
          isAnimating: false,
          currentAnimation: null
        });
        resolve();
      }, duration);
    });
  }

  // Stagger animation for multiple elements
  staggerAnimation(
    elements: HTMLElement[], 
    animation: (el: HTMLElement) => Promise<void>,
    staggerDelay: number = 120
  ): Promise<void> {
    return new Promise(async (resolve) => {
      for (let i = 0; i < elements.length; i++) {
        await new Promise(resolveDelay => setTimeout(resolveDelay, i * staggerDelay));
        await animation(elements[i]);
      }
      resolve();
    });
  }

  // Bounce animation
  bounce(element: HTMLElement, duration: number = 600): Promise<void> {
    return new Promise((resolve) => {
      this.animationState.next({
        isAnimating: true,
        currentAnimation: 'bounce'
      });

      element.style.transition = `all ${duration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`;
      element.style.transform = 'scale(1.05)';

      setTimeout(() => {
        element.style.transform = 'scale(1)';
        setTimeout(() => {
          this.animationState.next({
            isAnimating: false,
            currentAnimation: null
          });
          resolve();
        }, duration / 2);
      }, duration / 2);
    });
  }

  // Pulse animation
  pulse(element: HTMLElement, duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      this.animationState.next({
        isAnimating: true,
        currentAnimation: 'pulse'
      });

      element.style.transition = `all ${duration}ms ease-in-out`;
      element.style.transform = 'scale(1.02)';

      setTimeout(() => {
        element.style.transform = 'scale(1)';
        setTimeout(() => {
          this.animationState.next({
            isAnimating: false,
            currentAnimation: null
          });
          resolve();
        }, duration / 2);
      }, duration / 2);
    });
  }

  // Reset element styles
  resetElement(element: HTMLElement): void {
    element.style.transition = '';
    element.style.transform = '';
    element.style.opacity = '';
  }

  // Animate element when it comes into viewport
  animateOnScroll(element: HTMLElement, animation: (el: HTMLElement) => Promise<void>): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animation(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    observer.observe(element);
  }
} 