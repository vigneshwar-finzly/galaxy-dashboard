import { Component } from '@angular/core';

@Component({
  selector: 'app-navbar-demo',
  template: `
    <div class="navbar-demo">
      <h2>Modern Dashboard Navigation Bar Demo</h2>
      
      <div class="demo-section">
        <h3>🎨 Design Features</h3>
        <ul>
          <li>Linear/Notion-inspired modern design</li>
          <li>Clean typography with Inter font family</li>
          <li>Subtle shadows and blur effects</li>
          <li>Smooth animations and micro-interactions</li>
          <li>Responsive design for all screen sizes</li>
        </ul>
      </div>

      <div class="demo-section">
        <h3>🧭 Navigation Options</h3>
        <ul>
          <li><strong>Dashboard Selector:</strong> Choose from available dashboards with search and filtering</li>
          <li><strong>Create Dashboard:</strong> Start building new dashboards</li>
          <li><strong>Manage Dashboard:</strong> Edit and organize existing dashboards</li>
          <li><strong>Manage Widget:</strong> Configure and customize widgets</li>
          <li><strong>Create Widget:</strong> Add new widgets to dashboards</li>
        </ul>
      </div>

      <div class="demo-section">
        <h3>⚡ Actions Menu</h3>
        <ul>
          <li><strong>Full Screen Mode:</strong> Toggle full-screen view</li>
          <li><strong>Set as Default:</strong> Make current dashboard the default</li>
          <li><strong>Duplicate Dashboard:</strong> Create a copy of the current dashboard</li>
          <li><strong>Export Dashboard:</strong> Download dashboard as JSON</li>
          <li><strong>Share Dashboard:</strong> Generate shareable links</li>
          <li><strong>Delete Dashboard:</strong> Remove dashboards (with confirmation)</li>
        </ul>
      </div>

      <div class="demo-section">
        <h3>📱 Mobile Responsive</h3>
        <ul>
          <li>Collapsible navigation for smaller screens</li>
          <li>Touch-friendly interface with appropriate button sizes</li>
          <li>Mobile-optimized dropdowns and menus</li>
          <li>Quick action buttons for common tasks</li>
        </ul>
      </div>

      <div class="demo-section">
        <h3>🔧 Technical Features</h3>
        <ul>
          <li>TypeScript for type safety</li>
          <li>Angular Material for UI components</li>
          <li>FontAwesome for icons</li>
          <li>RxJS for reactive programming</li>
          <li>Angular Forms for input handling</li>
          <li>SCSS modules for maintainable styles</li>
        </ul>
      </div>

      <div class="demo-section">
        <h3>♿ Accessibility</h3>
        <ul>
          <li>Full keyboard navigation support</li>
          <li>ARIA labels and semantic HTML</li>
          <li>Clear focus indicators</li>
          <li>High contrast mode support</li>
          <li>Reduced motion preferences respected</li>
        </ul>
      </div>

      <div class="demo-note">
        <p><strong>Note:</strong> The actual navbar is implemented in the main application. This demo shows the features and capabilities of the modern navigation system.</p>
      </div>
    </div>
  `,
  styles: [`
    .navbar-demo {
      max-width: 800px;
      margin: 2rem auto;
      padding: 2rem;
      background: white;
      border-radius: 1rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, sans-serif;
    }

    h2 {
      color: #1f2937;
      font-size: 1.875rem;
      font-weight: 700;
      margin-bottom: 2rem;
      text-align: center;
      letter-spacing: -0.025em;
    }

    .demo-section {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: #f9fafb;
      border-radius: 0.75rem;
      border-left: 4px solid #3b82f6;
    }

    h3 {
      color: #111827;
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
      letter-spacing: -0.025em;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      color: #374151;
      font-size: 0.875rem;
      line-height: 1.6;
      margin-bottom: 0.5rem;
      padding-left: 1.5rem;
      position: relative;
    }

    li:before {
      content: "•";
      color: #3b82f6;
      font-weight: bold;
      position: absolute;
      left: 0;
    }

    li strong {
      color: #111827;
      font-weight: 600;
    }

    .demo-note {
      margin-top: 2rem;
      padding: 1rem;
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 0.5rem;
      color: #1e40af;
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .navbar-demo {
        margin: 1rem;
        padding: 1rem;
      }

      h2 {
        font-size: 1.5rem;
      }

      .demo-section {
        padding: 1rem;
      }
    }
  `]
})
export class NavbarDemoComponent {
  // This component serves as documentation and demo for the navbar features
}
