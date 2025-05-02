import React from 'react';
import { PlusCircle } from 'lucide-react';
import './Manage.css';

interface Project {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

interface ManageProps {
  projects: Project[];
}

const Manage: React.FC<ManageProps> = ({ projects = [] }) => {
  const handleNavigation = (path: string) => {
    window.location.href = path;
  };

  if (projects.length === 0) {
    return (
      <div className="manage-container">
        <div className="manage-text">
          <h2>No Projects Found</h2>
          <p>Get started by creating your first project</p>
        </div>
        <button className="manage-button" onClick={() => handleNavigation('/plan')}>
          <PlusCircle size={20} />
          <span>Create Project</span>
        </button>
      </div>
    );
  }

  return (
    <div className="manage-grid">
      {projects.map((project) => (
        <div key={project.id} className="manage-card">
          <div className="manage-header">
            <h3>{project.title}</h3>
          </div>
          <div className="manage-content">
            <p>{project.description}</p>
          </div>
          <div className="manage-footer">
            <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
            <button className="manage-view-button" onClick={() => handleNavigation(`/projects/${project.id}`)}>
              View Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Manage;
