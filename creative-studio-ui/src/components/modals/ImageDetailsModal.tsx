import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download as DownloadIcon, X as XIcon } from 'lucide-react';
import { imageGalleryService, type ImageMetadata, type ImageCollection } from '@/services/ImageGalleryService';

interface ImageDetailsModalProps {
  image: ImageMetadata;
  collections: ImageCollection[];
  onAddToCollection: (imageId: string, collectionId: string) => void;
  onRemoveFromCollection: (imageId: string, collectionId: string) => void;
  onClose: () => void;
}

export function ImageDetailsModal({ 
  image, 
  collections, 
  onAddToCollection, 
  onRemoveFromCollection, 
  onClose 
}: ImageDetailsModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
        <div className="flex h-[80vh]">
          <div className="flex-1 bg-black flex items-center justify-center p-4">
             <img src={image.url} alt={image.prompt || "Gallery Image"} className="max-w-full max-h-full object-contain" />
          </div>
          <div className="w-80 border-l p-6 flex flex-col gap-6 overflow-y-auto no-scrollbar">
             <div className="space-y-1">
                <h3 className="text-lg font-bold">Asset Details</h3>
                <p className="text-xs text-muted-foreground">ID: {image.id}</p>
             </div>

             <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Prompt</h4>
                  <div className="p-3 bg-muted rounded-lg text-xs leading-relaxed max-h-40 overflow-y-auto">
                    {image.prompt}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase">Model</span>
                      <p className="text-xs font-medium">{image.model}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase">Size</span>
                      <p className="text-xs font-medium">{image.size}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase">Date</span>
                      <p className="text-xs font-medium">{image.createdAt.toLocaleDateString()}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase">Type</span>
                      <p className="text-xs font-medium">{image.contextType}</p>
                   </div>
                </div>

                <div>
                   <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Add to Collection</h4>
                   <div className="flex gap-2">
                      <select 
                        title="Add to Collection"
                        className="flex-1 h-8 rounded border bg-background text-xs px-2 outline-none focus:ring-1 focus:ring-primary"
                        onChange={e => e.target.value && onAddToCollection(image.id, e.target.value)}
                        value=""
                      >
                         <option value="">Select collection...</option>
                         {collections.filter(c => !c.imageIds.includes(image.id)).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                         ))}
                      </select>
                   </div>
                </div>
                
                {collections.filter(c => c.imageIds.includes(image.id)).length > 0 && (
                   <div>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">In Collections</h4>
                      <div className="flex flex-wrap gap-1">
                         {collections.filter(c => c.imageIds.includes(image.id)).map(c => (
                            <Badge key={c.id} variant="secondary" className="gap-1 px-2 py-0.5 text-[10px]">
                               {c.name}
                               <XIcon className="w-2 h-2 cursor-pointer hover:text-destructive" onClick={() => onRemoveFromCollection(image.id, c.id)} />
                            </Badge>
                         ))}
                      </div>
                   </div>
                )}
             </div>

             <div className="mt-auto pt-6 flex flex-col gap-2">
                <Button className="w-full gap-2" size="sm" onClick={() => imageGalleryService.downloadImage(image.id)}>
                   <DownloadIcon className="w-4 h-4" />
                   Download Original
                </Button>
                <Button variant="outline" className="w-full gap-2" size="sm" onClick={onClose}>
                   Close
                </Button>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageDetailsModal;
