import React from 'react';
import { ErrorState } from '../ui/ErrorState';

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
}

// Catches render-time crashes in the route subtree and shows the design-system
// error state (never a blank white screen). Placed inside the pathname-keyed
// wrapper in App, so navigating to another route remounts and clears it.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown): void {
    // Surface it for debugging / an error monitor to pick up later.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] a page crashed while rendering:', error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-on-background flex items-center justify-center">
          <ErrorState
            title="This page hit a snag"
            message="Something went wrong while rendering this page. Refreshing usually fixes it."
            onRetry={() => window.location.reload()}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
