// src/hooks/useClock.js
import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function useClock() {
    const [agora, setAgora] = React.useState(new Date());

    React.useEffect(() => {
        const t = setInterval(() => setAgora(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const hora = React.useMemo(() => format(agora, "HH:mm:ss"), [agora]);
    const data = React.useMemo(
        () => format(agora, "dd MMM yyyy", { locale: ptBR }).toUpperCase(),
        [agora]
    );

    return { agora, hora, data };
}