import React from 'react';

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

export const PageHeader: React.FC<PageHeaderProps> = ({ title, eyebrow, description, actions }) => (
  <header className="rw-page-header">
    <div className="rw-page-header-copy">
      {eyebrow && <p className="rw-page-eyebrow">{eyebrow}</p>}
      <h1 className="rw-page-title">{title}</h1>
      {description && <p className="rw-page-description">{description}</p>}
    </div>
    {actions && <div className="rw-page-header-actions">{actions}</div>}
  </header>
);
