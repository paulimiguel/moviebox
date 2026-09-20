import { Navigate } from 'react-router-dom';

export const AddMoviesPage = () => {
  return <Navigate to="/?agregar=1" replace />;
};
