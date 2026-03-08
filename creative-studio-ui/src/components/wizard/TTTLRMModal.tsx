import React from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import { TTTLRMToolbox } from '../ai/TTTLRMToolbox';
import { useAppStore } from '@/stores/useAppStore';

/**
 * Modal wrapper for the tttLRM Reconstruction Tool.
 */
export const TTTLRMModal: React.FC = () => {
  const { showTTTLRMModal, setShowTTTLRMModal } = useAppStore();

  return (
    <Dialog 
      open={showTTTLRMModal} 
      onClose={() => setShowTTTLRMModal(false)}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'transparent',
          boxShadow: 'none',
          backgroundImage: 'none'
        }
      }}
    >
      <DialogTitle sx={{ display: 'none' }}>Reconstruction tttLRM</DialogTitle>
      
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        <IconButton 
          onClick={() => setShowTTTLRMModal(false)}
          sx={{ 
            position: 'absolute', 
            top: 12, 
            right: 12, 
            zIndex: 10, 
            color: 'rgba(255,255,255,0.5)',
            '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
          }}
        >
          <Close />
        </IconButton>
        
        <TTTLRMToolbox />
      </DialogContent>
    </Dialog>
  );
};
