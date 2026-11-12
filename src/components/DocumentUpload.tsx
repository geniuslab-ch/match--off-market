import { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Lock,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo (même limite que le stockage Supabase)
const ACCEPTED_TYPE = 'application/pdf';

interface DocumentUploadProps {
  /** Chemin du document déjà uploadé (si existant) */
  existingPath?: string;
  /** Callback appelé quand l'upload réussit — transmet le chemin du fichier */
  onUploadComplete: (filePath: string) => void;
}

export default function DocumentUpload({ existingPath, onUploadComplete }: DocumentUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(existingPath || null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    setError(null);

    // Validation type
    if (file.type !== ACCEPTED_TYPE) {
      setError('Seuls les fichiers PDF sont acceptés.');
      return;
    }

    // Validation taille
    if (file.size > MAX_FILE_SIZE) {
      setError(`Le fichier dépasse la taille maximale de 10 Mo (${(file.size / 1024 / 1024).toFixed(1)} Mo).`);
      return;
    }

    if (!supabase || !user) {
      setError('Vous devez être connecté pour uploader un document.');
      return;
    }

    setUploading(true);

    try {
      // Chemin unique par utilisateur — écrase l'ancien document
      const filePath = `${user.auth_id}/pre_approval_${Date.now()}.pdf`;

      // Supprimer l'ancien fichier si existant
      if (uploadedPath) {
        await supabase.storage.from('financial_documents').remove([uploadedPath]);
      }

      // Upload
      const { error: uploadError } = await supabase.storage
        .from('financial_documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: ACCEPTED_TYPE,
        });

      if (uploadError) {
        setError(
          /bucket not found/i.test(uploadError.message)
            ? "L'espace de stockage des documents n'est pas encore créé : exécutez la dernière version de supabase_pilote.sql dans Supabase."
            : `Erreur d'envoi : ${uploadError.message}`,
        );
        return;
      }

      setUploadedPath(filePath);
      onUploadComplete(filePath);
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'Erreur inattendue lors de l\'upload.');
    } finally {
      setUploading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input pour permettre de re-sélectionner le même fichier
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleRemove() {
    setUploadedPath(null);
    setError(null);
  }

  // === ÉTAT : Document déjà uploadé ===
  if (uploadedPath && !uploading) {
    return (
      <div className="rounded-2xl border border-emerald-800/50 bg-gradient-to-br from-emerald-950/50 to-slate-800 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-900/60">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-300">
              Document chiffr&eacute; et transmis avec succ&egrave;s
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <Lock className="h-3 w-3 text-emerald-500" />
              <span>Stock&eacute; de mani&egrave;re s&eacute;curis&eacute;e &mdash; accessible uniquement par vous</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
                <FileText className="h-3.5 w-3.5 text-cyan-500" />
                Pr&eacute;-approbation bancaire.pdf
              </span>
              <button
                type="button"
                onClick={handleRemove}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-red-950 hover:text-red-400 transition-colors"
                title="Supprimer le document"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-950/40 px-3 py-2">
          <Shield className="h-4 w-4 text-emerald-500" />
          <p className="text-xs text-emerald-400/80">
            +30 points ajout&eacute;s &agrave; votre score acheteur
          </p>
        </div>
      </div>
    );
  }

  // === ÉTAT : Zone d'upload ===
  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver
            ? 'border-cyan-400 bg-cyan-950/30'
            : 'border-slate-600 bg-gradient-to-br from-slate-800 to-slate-900 hover:border-cyan-500/60 hover:bg-slate-800'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleInputChange}
          className="hidden"
        />

        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-400" />
            <p className="text-sm font-medium text-cyan-300">Chiffrement et transmission en cours...</p>
            <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400" style={{ width: '70%' }} />
            </div>
          </div>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-lg group-hover:from-cyan-900 group-hover:to-cyan-950 transition-all">
              <UploadCloud className="h-7 w-7 text-slate-400 group-hover:text-cyan-400 transition-colors" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-200">
              D&eacute;posez votre pr&eacute;-approbation bancaire ici
            </p>
            <p className="mt-1 text-xs text-slate-500">
              ou <span className="text-cyan-400 underline underline-offset-2">parcourez vos fichiers</span>
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> PDF uniquement
              </span>
              <span>&bull;</span>
              <span>10 Mo max</span>
            </div>
          </>
        )}

        {/* Bandeau sécurité */}
        <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-slate-900/60 px-3 py-2">
          <Lock className="h-3 w-3 text-cyan-600" />
          <p className="text-xs text-slate-500">
            Document confidentiel &mdash; chiffr&eacute; et accessible uniquement par vous
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-950 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
