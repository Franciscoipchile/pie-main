import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useUsuarios, ROLE_LABEL, roleBadgeCls } from "@/store/usuarios";
import type { Role } from "@/store";

interface Props {
  value?: string;
  onChange: (nombre: string, usuario?: { id: string; role: Role; nombre: string }) => void;
  placeholder?: string;
  roles?: Role[];
  className?: string;
  id?: string;
}

/**
 * Selector desplegable buscable de usuarios del sistema.
 * Comparte la fuente única `useUsuarios` para que cualquier alta
 * desde Administrador aparezca automáticamente en todos los formularios.
 */
export function UserSelect({
  value,
  onChange,
  placeholder = "Selecciona un usuario",
  roles,
  className,
  id,
}: Props) {
  const { usuarios } = useUsuarios();
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () => (roles ? usuarios.filter((u) => roles.includes(u.role)) : usuarios),
    [usuarios, roles],
  );

  const selected = filtered.find((u) => u.nombre === value);
  const noUsers = filtered.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="flex items-center gap-2 truncate">
            <Users className="size-4 text-muted-foreground shrink-0" />
            {selected ? (
              <>
                <span className="truncate">{selected.nombre}</span>
                <Badge className={cn("text-[10px] h-5", roleBadgeCls(selected.role))}>
                  {ROLE_LABEL[selected.role]}
                </Badge>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {noUsers ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No hay usuarios disponibles, créalos desde el panel de Administrador
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Buscar usuario..." />
            <CommandList>
              <CommandEmpty>Sin resultados</CommandEmpty>
              <CommandGroup>
                {filtered.map((u) => (
                  <CommandItem
                    key={u.id}
                    value={`${u.nombre} ${ROLE_LABEL[u.role]}`}
                    onSelect={() => {
                      onChange(u.nombre, { id: u.id, role: u.role, nombre: u.nombre });
                      setOpen(false);
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          value === u.nombre ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{u.nombre}</span>
                    </span>
                    <Badge className={cn("text-[10px] h-5 shrink-0", roleBadgeCls(u.role))}>
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}
