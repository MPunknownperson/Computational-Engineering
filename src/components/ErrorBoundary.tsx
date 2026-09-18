import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Nova } from './mascot/Nova';

interface Props { children: ReactNode; onReset?: () => void }
interface State { error: Error | null }

/**
 * Keeps one broken view from blanking the whole document.
 *
 * Previously any throw inside a lazily loaded page (a failed chunk, a malformed
 * cached value in localStorage, an unexpected API payload) unmounted the entire
 * tree and left a white screen with no way back. The boundary catches it,
 * explains what happened and offers a recovery path that does not require the
 * visitor to know what a hash route is.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (typeof console !== 'undefined') console.error('Render failure', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="error-boundary" role="alert">
        <Nova mood="think" size={140} />
        <div>
          <h1>That section did not load</h1>
          <p>
            Something in this view failed while rendering. Nothing you have saved on this device has
            been lost — the calculators and your history are still intact.
          </p>
          <p className="error-detail"><code>{this.state.error.message}</code></p>
          <div className="error-actions">
            <button type="button" className="primary-button" onClick={this.reset}>Try this page again</button>
            <button type="button" className="secondary-button" onClick={() => { window.location.hash = ''; this.reset(); }}>Go to the home page</button>
            <button type="button" className="secondary-button" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      </section>
    );
  }
}
