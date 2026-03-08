export const maskMatricula = (valor, digitos = 8) => {
    if (!valor) return "";
    const numeros = valor.replace(/\D/g, "");
    if (numeros.length <= digitos - 1) return numeros;
    return `${numeros.slice(0, digitos - 1)}-${numeros.slice(digitos - 1, digitos)}`;
};

export const unmaskMatricula = (valor, digitos = 8) => {
    return valor.replace(/\D/g, "").slice(0, digitos);
};
