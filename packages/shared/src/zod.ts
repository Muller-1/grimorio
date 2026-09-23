import { config, z } from 'zod';

// O site roda com uma Content-Security-Policy sem 'unsafe-eval' (apps/web/public/_headers).
// Por padrão o Zod 4 testa `new Function(...)` para gerar validadores mais rápidos, e o navegador
// registra uma violação da política. Sem o modo JIT, as validações são idênticas, só não usam
// eval — o mesmo comportamento no navegador e no Node. Todo schema importa o `z` daqui.
config({ jitless: true });

export { z };
