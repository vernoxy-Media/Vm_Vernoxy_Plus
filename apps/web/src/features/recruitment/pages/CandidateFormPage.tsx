import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CandidatesPage } from './CandidatesPage';
import { AddCandidateModal } from '../components/AddCandidateModal';

export const CandidateFormPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <CandidatesPage />
      <AddCandidateModal
        isOpen={true}
        onClose={() => navigate('/admin/recruitment')}
        onSuccess={() => navigate('/admin/recruitment')}
      />
    </>
  );
};
