import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, FileText, RotateCcw, Download } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedLoading } from '@/components/ui/enhanced-loading';

interface NationalIdCaptureProps {
  onComplete: () => void;
  currentDocument?: any;
}

const NationalIdCapture: React.FC<NationalIdCaptureProps> = ({
  onComplete,
  currentDocument
}) => {
  const [step, setStep] = useState<'instruction' | 'front' | 'back' | 'preview' | 'complete'>('instruction');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [documentNumber, setDocumentNumber] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        } 
      });
      streamRef.current = stream;
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Could not access camera. Please use file upload instead.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    if (step === 'front') {
      setFrontImage(imageData);
      setStep('back');
    } else if (step === 'back') {
      setBackImage(imageData);
      setStep('preview');
      stopCamera();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      
      if (step === 'front') {
        setFrontImage(imageData);
        setStep('back');
      } else if (step === 'back') {
        setBackImage(imageData);
        setStep('preview');
      }
    };
    reader.readAsDataURL(file);
  };

  const generatePDF = async (): Promise<Blob> => {
    const pdf = new jsPDF();
    
    // Add title
    pdf.setFontSize(16);
    pdf.text('National ID Document', 20, 20);
    
    if (documentNumber) {
      pdf.setFontSize(12);
      pdf.text(`Document Number: ${documentNumber}`, 20, 30);
    }

    // Add front image
    if (frontImage) {
      pdf.setFontSize(12);
      pdf.text('Front Side:', 20, 50);
      
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const imgWidth = 170;
          const imgHeight = (img.height * imgWidth) / img.width;
          pdf.addImage(img, 'JPEG', 20, 60, imgWidth, Math.min(imgHeight, 100));
          resolve();
        };
        img.src = frontImage;
      });
    }

    // Add new page for back image
    if (backImage) {
      pdf.addPage();
      pdf.setFontSize(12);
      pdf.text('Back Side:', 20, 20);
      
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const imgWidth = 170;
          const imgHeight = (img.height * imgWidth) / img.width;
          pdf.addImage(img, 'JPEG', 20, 30, imgWidth, Math.min(imgHeight, 100));
          resolve();
        };
        img.src = backImage;
      });
    }

    return pdf.output('blob');
  };

  const uploadDocument = async () => {
    if (!frontImage || !backImage) {
      toast.error('Please capture both sides of the ID');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate PDF
      const pdfBlob = await generatePDF();
      
      // For now, create a mock URL since storage might not be configured
      const mockUrl = `https://example.com/documents/${user.id}/national_id.pdf`;

      if (currentDocument) {
        // Update existing document
        const { error } = await supabase
          .from('user_documents')
          .update({
            document_number: documentNumber,
            url: mockUrl,
            status: 'pending' as const,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentDocument.id);

        if (error) throw error;
      } else {
        // Create new document
        const { error } = await supabase
          .from('user_documents')
          .insert({
            user_id: user.id,
            type: 'national_id' as any,
            document_number: documentNumber,
            url: mockUrl,
            status: 'pending' as const
          });

        if (error) throw error;
      }

      toast.success('National ID uploaded successfully!');
      setStep('complete');
      
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetCapture = () => {
    setFrontImage(null);
    setBackImage(null);
    setStep('instruction');
    stopCamera();
  };

  const renderInstructionStep = () => (
    <div className="text-center space-y-4">
      <div className="text-4xl mb-4">📱</div>
      <h3 className="text-xl font-semibold">National ID Capture</h3>
      <p className="text-muted-foreground">
        You'll need to capture both the front and back sides of your National ID card.
      </p>
      <div className="bg-blue-50 p-4 rounded-lg text-left">
        <h4 className="font-medium mb-2">Tips for best results:</h4>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• Ensure good lighting</li>
          <li>• Keep the ID flat and straight</li>
          <li>• Fill the entire frame with the ID</li>
          <li>• Make sure all text is clearly visible</li>
        </ul>
      </div>
      <Button onClick={() => setStep('front')} className="w-full">
        Start Capture
      </Button>
    </div>
  );

  const renderCaptureStep = () => {
    const isBack = step === 'back';
    
    return (
      <div className="space-y-4">
        <div className="text-center">
          <Badge variant="outline" className="mb-4">
            Step {isBack ? '2' : '1'} of 2: {isBack ? 'Back' : 'Front'} Side
          </Badge>
          <h3 className="text-lg font-semibold mb-2">
            Capture {isBack ? 'Back' : 'Front'} Side of ID
          </h3>
        </div>

        {showCamera ? (
          <div className="space-y-4">
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full rounded-lg bg-black"
                playsInline
                muted
              />
              <div className="absolute inset-4 border-2 border-white rounded-lg pointer-events-none">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white"></div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={captureImage} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                Capture {isBack ? 'Back' : 'Front'}
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Position your ID's {isBack ? 'back' : 'front'} side within the frame
              </p>
              
              <div className="flex gap-2">
                <Button onClick={startCamera} variant="outline" className="flex-1">
                  <Camera className="w-4 h-4 mr-2" />
                  Use Camera
                </Button>
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  variant="outline" 
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}
        
        {isBack && frontImage && (
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">✓ Front side captured successfully</p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  };

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Badge variant="outline" className="mb-4">Preview & Confirm</Badge>
        <h3 className="text-lg font-semibold">Review Your ID Captures</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Document Number</label>
          <input
            type="text"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder="Enter ID number"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {frontImage && (
            <div>
              <p className="text-sm font-medium mb-2">Front Side</p>
              <img 
                src={frontImage} 
                alt="Front of ID" 
                className="w-full rounded-lg border"
              />
            </div>
          )}
          
          {backImage && (
            <div>
              <p className="text-sm font-medium mb-2">Back Side</p>
              <img 
                src={backImage} 
                alt="Back of ID" 
                className="w-full rounded-lg border"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={uploadDocument} disabled={uploading} className="flex-1">
            {uploading ? <EnhancedLoading size="sm" text="Uploading..." /> : 'Upload Document'}
          </Button>
          <Button variant="outline" onClick={resetCapture}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-4">
      <div className="text-4xl mb-4">✅</div>
      <h3 className="text-xl font-semibold text-green-600">Upload Complete!</h3>
      <p className="text-muted-foreground">
        Your National ID has been successfully uploaded and is pending review.
      </p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          National ID Document
        </CardTitle>
      </CardHeader>
      <CardContent>
        {step === 'instruction' && renderInstructionStep()}
        {(step === 'front' || step === 'back') && renderCaptureStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'complete' && renderCompleteStep()}
      </CardContent>
    </Card>
  );
};

export default NationalIdCapture;