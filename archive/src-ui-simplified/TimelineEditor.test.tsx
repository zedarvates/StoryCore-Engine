import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TimelineEditor from './TimelineEditor';

describe('TimelineEditor', () => {
  it('should render the TimelineEditor component', () => {
    render(<TimelineEditor />);
    expect(screen.getByText('Séquences')).toBeInTheDocument();
  });

  it('should add a new event to the selected sequence', () => {
    render(<TimelineEditor />);
    const sequence = screen.getByText('Séquence 1');
    fireEvent.click(sequence);

    const titleInput = screen.getByPlaceholderText('Titre');
    const startTimeInput = screen.getByPlaceholderText('Heure de début');
    const endTimeInput = screen.getByPlaceholderText('Heure de fin');
    const descriptionInput = screen.getByPlaceholderText('Description');
    const mediaUrlInput = screen.getByPlaceholderText('URL du média');
    const addButton = screen.getByText('Ajouter');

    fireEvent.change(titleInput, { target: { value: 'Nouvel Événement' } });
    fireEvent.change(startTimeInput, { target: { value: '0' } });
    fireEvent.change(endTimeInput, { target: { value: '20' } });
    fireEvent.change(descriptionInput, { target: { value: 'Description du nouvel événement' } });
    fireEvent.change(mediaUrlInput, { target: { value: 'https://example.com/media2.mp4' } });
    fireEvent.click(addButton);

    expect(screen.getByText('Nouvel Événement')).toBeInTheDocument();
  });

  it('should delete an event from the selected sequence', () => {
    render(<TimelineEditor />);
    const sequence = screen.getByText('Séquence 1');
    fireEvent.click(sequence);

    const deleteButton = screen.getAllByText('Supprimer')[0];
    fireEvent.click(deleteButton);

    expect(screen.queryByText('Événement 1')).not.toBeInTheDocument();
  });

  it('should show an error message when adding an invalid event', () => {
    render(<TimelineEditor />);
    const sequence = screen.getByText('Séquence 1');
    fireEvent.click(sequence);

    const titleInput = screen.getByPlaceholderText('Titre');
    const startTimeInput = screen.getByPlaceholderText('Heure de début');
    const endTimeInput = screen.getByPlaceholderText('Heure de fin');
    const addButton = screen.getByText('Ajouter');

    fireEvent.change(titleInput, { target: { value: '' } });
    fireEvent.change(startTimeInput, { target: { value: '20' } });
    fireEvent.change(endTimeInput, { target: { value: '10' } });
    fireEvent.click(addButton);

    expect(screen.getByText('Veuillez remplir tous les champs correctement.')).toBeInTheDocument();
  });
});