import React, { useState, useEffect } from 'react';
import './TimelineEditor.css';
import timelineService from '../services/timelineService';

interface Event {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  description?: string;
  mediaUrl?: string;
}

interface Sequence {
  id: string;
  title: string;
  events: Event[];
}

const TimelineEditor: React.FC = () => {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
  const [newEvent, setNewEvent] = useState<Omit<Event, 'id'>>({
    title: '',
    startTime: 0,
    endTime: 0,
    description: '',
    mediaUrl: '',
  });

  useEffect(() => {
    // Charger les séquences depuis une API ou une base de données
    const fetchSequences = async () => {
      try {
        const fetchedSequences = await timelineService.fetchSequences();
        setSequences(fetchedSequences);
      } catch (error) {
        console.error('Erreur lors du chargement des séquences:', error);
      }
    };

    fetchSequences();
  }, []);

  const handleAddEvent = () => {
    if (!selectedSequence) return;

    const eventToAdd: Event = {
      ...newEvent,
      id: Date.now().toString(),
    };

    // Valider l'événement avant de l'ajouter
    if (!timelineService.validateEvent(eventToAdd)) {
      alert('Veuillez remplir tous les champs correctement.');
      return;
    }

    // Vérifier les conflits avec les événements existants
    const updatedEvents = [...selectedSequence.events, eventToAdd];
    if (timelineService.checkForConflicts(updatedEvents)) {
      alert('Conflit détecté avec un événement existant.');
      return;
    }

    const updatedSequences = sequences.map((sequence) => {
      if (sequence.id === selectedSequence.id) {
        return {
          ...sequence,
          events: updatedEvents,
        };
      }
      return sequence;
    });

    setSequences(updatedSequences);
    setNewEvent({
      title: '',
      startTime: 0,
      endTime: 0,
      description: '',
      mediaUrl: '',
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!selectedSequence) return;

    const updatedSequences = sequences.map((sequence) => {
      if (sequence.id === selectedSequence.id) {
        return {
          ...sequence,
          events: sequence.events.filter((event) => event.id !== eventId),
        };
      }
      return sequence;
    });

    setSequences(updatedSequences);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, eventId: string) => {
    e.dataTransfer.setData('eventId', eventId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetEventId: string) => {
    e.preventDefault();
    const draggedEventId = e.dataTransfer.getData('eventId');

    if (!selectedSequence) return;

    const draggedEventIndex = selectedSequence.events.findIndex(
      (event) => event.id === draggedEventId
    );
    const targetEventIndex = selectedSequence.events.findIndex(
      (event) => event.id === targetEventId
    );

    if (draggedEventIndex === -1 || targetEventIndex === -1) return;

    const updatedEvents = [...selectedSequence.events];
    const [draggedEvent] = updatedEvents.splice(draggedEventIndex, 1);
    updatedEvents.splice(targetEventIndex, 0, draggedEvent);

    // Vérifier les conflits après le glisser-déposer
    if (timelineService.checkForConflicts(updatedEvents)) {
      alert('Conflit détecté après le déplacement.');
      return;
    }

    const updatedSequences = sequences.map((sequence) => {
      if (sequence.id === selectedSequence.id) {
        return {
          ...sequence,
          events: updatedEvents,
        };
      }
      return sequence;
    });

    setSequences(updatedSequences);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="timeline-editor">
      <div className="sequences-list">
        <h2>Séquences</h2>
        <ul>
          {sequences.map((sequence) => (
            <li
              key={sequence.id}
              onClick={() => setSelectedSequence(sequence)}
              className={selectedSequence?.id === sequence.id ? 'active' : ''}
            >
              {sequence.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="timeline-container">
        {selectedSequence ? (
          <div className="timeline">
            <h2>{selectedSequence.title}</h2>
            <div className="events-list">
              {selectedSequence.events.map((event) => (
                <div
                  key={event.id}
                  className="event"
                  draggable
                  onDragStart={(e) => handleDragStart(e, event.id)}
                  onDrop={(e) => handleDrop(e, event.id)}
                  onDragOver={handleDragOver}
                >
                  <div className="event-header">
                    <span>{event.title}</span>
                    <button onClick={() => handleDeleteEvent(event.id)}>Supprimer</button>
                  </div>
                  <div className="event-details">
                    <p>Début: {event.startTime}</p>
                    <p>Fin: {event.endTime}</p>
                    <p>{event.description}</p>
                    {event.mediaUrl && <p>Média: {event.mediaUrl}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="add-event-form">
              <h3>Ajouter un événement</h3>
              <input
                type="text"
                placeholder="Titre"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              />
              <input
                type="number"
                placeholder="Heure de début"
                value={newEvent.startTime}
                onChange={(e) => setNewEvent({ ...newEvent, startTime: Number(e.target.value) })}
              />
              <input
                type="number"
                placeholder="Heure de fin"
                value={newEvent.endTime}
                onChange={(e) => setNewEvent({ ...newEvent, endTime: Number(e.target.value) })}
              />
              <input
                type="text"
                placeholder="Description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              />
              <input
                type="text"
                placeholder="URL du média"
                value={newEvent.mediaUrl}
                onChange={(e) => setNewEvent({ ...newEvent, mediaUrl: e.target.value })}
              />
              <button onClick={handleAddEvent}>Ajouter</button>
            </div>
          </div>
        ) : (
          <p>Veuillez sélectionner une séquence.</p>
        )}
      </div>
    </div>
  );
};

export default TimelineEditor;