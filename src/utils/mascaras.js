export const maskMatricula = (valor) => {
    if (!valor) return "";
    const numeros = valor.replace(/\D/g, "");
    if (numeros.length <= 7) return numeros;
    return `${numeros.slice(0, 7)}-${numeros.slice(7, 8)}`;
};

export const unmaskMatricula = (valor) => {
    return valor.replace(/\D/g, "").slice(0, 8);
};
