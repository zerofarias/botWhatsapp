import type { ReactNode } from 'react';
import '../../styles/page-shell.css';

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  fullHeight?: boolean;
}

const PageShell: React.FC<PageShellProps> = ({
  title,
  subtitle = 'Panel principal',
  actions,
  children,
  className = '',
  bodyClassName = '',
  fullHeight = false,
}) => {
  return (
    <div className={`page-shell ${className}`}>
      <div className="page-shell-header">
        <div>
          <p className="page-shell-subtitle">{subtitle}</p>
          <h1 className="page-shell-title">{title}</h1>
        </div>
        {actions && <div className="page-shell-actions">{actions}</div>}
      </div>
      <div
        className={`page-shell-body${
          fullHeight ? ' page-shell-body--full' : ''
        } ${bodyClassName}`}
      >
        {children}
      </div>
    </div>
  );
};

export default PageShell;
