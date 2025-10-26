import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Music, Radio, Copy, Trash2, Edit2, Plus, Check, Headphones, Clipboard } from "lucide-react";

interface RadioInfo {
  name: string;
  queueLength: number;
  isPlaying: boolean;
}

export default function Home() {
  const { toast } = useToast();
  const [radios, setRadios] = useState<RadioInfo[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [newRadioName, setNewRadioName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Delete confirmation
  const [radioToDelete, setRadioToDelete] = useState<string | null>(null);
  
  // Edit name dialog
  const [radioToEdit, setRadioToEdit] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  
  // Copy URL feedback
  const [copiedRadio, setCopiedRadio] = useState<string | null>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      ws.send(JSON.stringify({ type: "get_all_radios" }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case "all_radios":
            setRadios(message.data.radios);
            break;
          case "radio_created":
            toast({
              title: "Nueva radio creada",
              description: `La radio "${message.data.name}" ha sido creada`,
            });
            break;
          case "radio_renamed":
            toast({
              title: "Radio renombrada",
              description: `"${message.data.oldName}" ahora se llama "${message.data.newName}"`,
            });
            break;
          case "radio_deleted":
            toast({
              title: "Radio eliminada",
              description: `La radio "${message.data.name}" ha sido eliminada`,
            });
            break;
          case "error":
            toast({
              title: "Error",
              description: message.data.message,
              variant: "destructive",
            });
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const handleCreateRadio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRadioName.trim() || !socket) return;

    setIsCreating(true);
    socket.send(JSON.stringify({
      type: "create_radio",
      data: { name: newRadioName.trim().toLowerCase() }
    }));
    setNewRadioName("");
    setIsCreating(false);
  };

  const handleDeleteRadio = () => {
    if (!radioToDelete || !socket) return;

    socket.send(JSON.stringify({
      type: "delete_radio",
      data: { name: radioToDelete }
    }));
    setRadioToDelete(null);
  };

  const handleRenameRadio = () => {
    if (!radioToEdit || !editedName.trim() || !socket) return;

    socket.send(JSON.stringify({
      type: "rename_radio",
      data: { oldName: radioToEdit, newName: editedName.trim().toLowerCase() }
    }));
    setRadioToEdit(null);
    setEditedName("");
  };

  const handleCopyStreamUrl = async (radioName: string) => {
    const streamUrl = `${window.location.protocol}//${window.location.host}/stream/${radioName}`;
    try {
      await navigator.clipboard.writeText(streamUrl);
      setCopiedRadio(radioName);
      toast({
        title: "URL copiada!",
        description: "El enlace de streaming ha sido copiado al portapapeles",
      });
      setTimeout(() => setCopiedRadio(null), 2000);
    } catch (error) {
      toast({
        title: "Error al copiar",
        description: "Por favor, copia la URL manualmente",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (radioName: string) => {
    setRadioToEdit(radioName);
    setEditedName(radioName);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="border-b">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <Radio className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Plataforma Multi-Radio
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Crea estaciones de radio colaborativas con reproducción en tiempo real. Agrega canciones desde YouTube o Spotify
              y transmite a Minecraft Simple Voice Chat Radio.
            </p>
          </div>
        </div>
      </section>

      {/* Create New Radio Form */}
      <section className="border-b bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <Card className="p-6 md:p-8 max-w-2xl mx-auto">
            <form onSubmit={handleCreateRadio} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-semibold mb-2">Crear Nueva Radio</h2>
                <p className="text-sm text-muted-foreground">
                  Ingresa un nombre único para tu nueva estación de radio
                </p>
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <Input
                  type="text"
                  placeholder="Nombre de la radio (ej: musica-electronica)"
                  value={newRadioName}
                  onChange={(e) => setNewRadioName(e.target.value)}
                  className="flex-1 h-12 md:h-14 px-4 md:px-6 rounded-xl"
                  disabled={isCreating}
                  data-testid="input-new-radio-name"
                />
                <Button
                  type="submit"
                  disabled={!newRadioName.trim() || isCreating}
                  className="h-12 md:h-14 px-6 md:px-8 rounded-xl gap-2"
                  data-testid="button-create-radio"
                >
                  <Plus className="w-5 h-5" />
                  Crear Radio
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </section>

      {/* Radio Stations List */}
      <section className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Radios Disponibles</h2>
            <p className="text-lg text-muted-foreground">
              {radios.length} {radios.length === 1 ? "radio activa" : "radios activas"}
            </p>
          </div>

          {radios.length === 0 ? (
            <Card className="p-16 text-center max-w-2xl mx-auto">
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <Radio className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium text-muted-foreground">No hay radios creadas</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Crea tu primera radio usando el formulario de arriba
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {radios.map((radio) => (
                <Card key={radio.name} className="p-6 space-y-4" data-testid={`card-radio-${radio.name}`}>
                  {/* Radio Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold capitalize truncate" data-testid={`text-radio-name-${radio.name}`}>
                        {radio.name}
                      </h3>
                      {radio.isPlaying && (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          En vivo
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {radio.queueLength} {radio.queueLength === 1 ? "canción" : "canciones"} en cola
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Link href={`/radio/${radio.name}`}>
                      <Button 
                        variant="default" 
                        className="w-full gap-2"
                        data-testid={`button-enter-${radio.name}`}
                      >
                        <Headphones className="w-4 h-4" />
                        Entrar
                      </Button>
                    </Link>
                    
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => handleCopyStreamUrl(radio.name)}
                      data-testid={`button-copy-url-${radio.name}`}
                    >
                      {copiedRadio === radio.name ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Clipboard className="w-4 h-4" />
                          Copiar URL
                        </>
                      )}
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                        onClick={() => openEditDialog(radio.name)}
                        data-testid={`button-edit-${radio.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                        onClick={() => setRadioToDelete(radio.name)}
                        data-testid={`button-delete-${radio.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!radioToDelete} onOpenChange={(open) => !open && setRadioToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la radio "{radioToDelete}". 
              Todos los usuarios conectados a esta radio serán desconectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRadio}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Name Dialog */}
      <Dialog open={!!radioToEdit} onOpenChange={(open) => !open && setRadioToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nombre de Radio</DialogTitle>
            <DialogDescription>
              Cambia el nombre de la radio "{radioToEdit}". Los usuarios conectados verán el cambio automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Nuevo nombre de la radio"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="h-12 px-4"
              data-testid="input-edit-radio-name"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRadioToEdit(null)}
              data-testid="button-cancel-edit"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleRenameRadio}
              disabled={!editedName.trim() || editedName.trim().toLowerCase() === radioToEdit}
              data-testid="button-confirm-edit"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
