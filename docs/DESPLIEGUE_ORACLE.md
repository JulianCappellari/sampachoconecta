# Publicar Sampacho Conecta gratis en Oracle Cloud (desde cero)

Guía paso a paso para alguien que **nunca desplegó** una aplicación. Al final vas a tener la página funcionando con HTTPS, una dirección web propia gratuita y copias de seguridad diarias, sin pagar.

> Los menús de Oracle y DuckDNS cambian de nombre y de lugar con frecuencia. Si algo no aparece exactamente igual, buscá el término equivalente. Las condiciones del plan gratuito también cambian: confirmalas en [Always Free Resources](https://docs.oracle.com/iaas/Content/FreeTier/resourceref.htm).

## Qué necesitás

- Una **tarjeta de crédito o débito internacional** (Oracle la pide para verificar tu identidad; no cobra mientras uses solo lo gratuito).
- Un **email** y un **celular** para recibir códigos.
- Tu computadora con Windows (PowerShell).
- Entre 1 y 2 horas la primera vez.

## Cómo funciona (en una imagen mental)

```
Vecinos ──https──▶ Caddy (certificado automático) ──▶ App (Next.js + SQLite)
                                                       └── carpeta "data": base + fotos
```

Todo corre en **una sola máquina virtual** de Oracle, dentro de contenedores Docker. La carpeta `data` está en el disco de esa máquina, por eso no se pierde al reiniciar ni al actualizar.

---

## Paso 1. Crear la cuenta de Oracle Cloud

1. Entrá a <https://www.oracle.com/cloud/free/> y elegí **Start for free**.
2. Completá tus datos. En **Home Region** elegí **Brazil East (São Paulo)**: es la más cercana a Argentina. **No se puede cambiar después.**
3. Verificá tu tarjeta. Es normal que aparezca una autorización pequeña que luego se anula.
4. Esperá el email de confirmación (puede tardar unos minutos) e iniciá sesión en la consola.

**Importante para no pagar:**
- Tu cuenta empieza con un período de prueba. **No hagas "Upgrade" a Pay As You Go.** Al terminar la prueba, la cuenta sigue con los recursos "Always Free".
- Creá solo recursos que digan **Always Free eligible**.

## Paso 2. Crear tu llave SSH (para entrar al servidor)

Abrí **PowerShell** en tu computadora y ejecutá:

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\oracle_sampacho
```

Te pide una contraseña para la llave (opcional: podés apretar Enter dos veces). Esto crea dos archivos en `C:\Users\TU_USUARIO\.ssh\`:

- `oracle_sampacho` → **llave privada**. Es secreta, no la compartas.
- `oracle_sampacho.pub` → llave pública. Esta sí se sube a Oracle.

Mostrá la pública para copiarla en el paso siguiente:

```powershell
Get-Content $env:USERPROFILE\.ssh\oracle_sampacho.pub
```

## Paso 3. Crear la máquina virtual

1. En la consola de Oracle: menú ☰ → **Compute** → **Instances** → **Create instance**.
2. **Name:** `sampacho`.
3. **Image and shape** → **Edit**:
   - **Image:** Canonical **Ubuntu 24.04** (para Ampere elegí la versión **aarch64**).
   - **Shape:** **Change shape** → pestaña **Ampere** → **VM.Standard.A1.Flex** → **2 OCPU y 12 GB de memoria**. Verificá que figure como *Always Free eligible*.
4. **Networking:** dejá la red nueva que propone y tildá **Assign a public IPv4 address**.
5. **Add SSH keys** → **Paste public keys** → pegá el contenido de `oracle_sampacho.pub`.
6. **Boot volume:** 50 a 100 GB (el gratuito incluye hasta 200 GB entre todos los discos).
7. **Create**. Espera a que el estado pase a **Running** y anotá la **Public IP address**.

**Si dice "Out of capacity for shape VM.Standard.A1.Flex":** Oracle no tiene lugar gratuito en ese momento. Probá otro *Availability Domain* si hay más de uno, o reintentá en otro horario (de madrugada suele haber lugar). Puede llevar varios intentos.

> Opcional pero recomendable: en **Networking → IP management → Reserved public IPs** reservá una IP y asignala a la máquina, así no cambia si la recreás. Verificá que sea gratuita en tu cuenta.

## Paso 4. Abrir los puertos 80 y 443 en Oracle

Oracle bloquea todo por defecto. Hay que permitir la web:

1. En la página de tu instancia, entrá a la **Virtual cloud network** → **Subnets** → tu subred pública → **Security Lists** → *Default Security List*.
2. **Add Ingress Rules** y creá tres reglas:

| Source CIDR | Protocolo | Puerto destino |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |
| `0.0.0.0/0` | UDP | `443` |

## Paso 5. Conectarte a tu servidor

En PowerShell (reemplazá `IP_PUBLICA` por la IP del paso 3):

```powershell
ssh -i $env:USERPROFILE\.ssh\oracle_sampacho ubuntu@IP_PUBLICA
```

La primera vez pregunta si confiás en el servidor: escribí `yes`. Si ves un prompt como `ubuntu@sampacho:~$`, estás adentro. Los comandos siguientes se escriben **ahí**.

*Si Windows se queja de que la llave es "demasiado abierta" (`UNPROTECTED PRIVATE KEY FILE`), ejecutá en PowerShell:*

```powershell
icacls $env:USERPROFILE\.ssh\oracle_sampacho /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

## Paso 6. Abrir el firewall interno de Ubuntu

Las imágenes de Oracle traen además un firewall dentro del sistema. Ejecutá:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 443 -j ACCEPT
sudo apt-get update && sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

(Si el instalador pregunta si guardar las reglas actuales, respondé **Yes**.)

## Paso 7. Instalar Docker y Git

```bash
sudo apt-get -y upgrade
sudo apt-get install -y git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Ahora **salí y volvé a entrar** para que el permiso de Docker se aplique:

```bash
exit
```

Volvé a conectarte con el comando del paso 5 y comprobá:

```bash
docker --version
docker compose version
```

## Paso 8. Conseguir una dirección web gratuita (DuckDNS)

1. Entrá a <https://www.duckdns.org/> e iniciá sesión con tu cuenta de Google o GitHub.
2. En **sub domain** escribí un nombre, por ejemplo `sampachoconecta`, y apretá **add domain**.
3. En el campo **current ip** del dominio pegá la **IP pública** de tu máquina y apretá **update ip**.

Tu dirección queda: `sampachoconecta.duckdns.org`. (Si más adelante comprás un dominio propio, por ejemplo un `.com.ar`, solo cambiás `DOMAIN` en el archivo `.env` y reiniciás.)

## Paso 9. Bajar el código y configurarlo

En el servidor:

```bash
git clone https://github.com/JulianCappellari/sampachoconecta.git
cd sampachoconecta/deploy
cp .env.example .env
nano .env
```

En `nano` completá estas líneas (usá las flechas para moverte):

```
DOMAIN=sampachoconecta.duckdns.org
SEED_PASSWORD=una-contraseña-larga-solo-para-las-pruebas
ADMIN_PASSWORD=otra-contraseña-larga-para-la-cuenta-real
```

Para guardar: **Ctrl+O**, **Enter**, y salir con **Ctrl+X**. Las contraseñas deben tener **al menos 12 caracteres**. Dejá en blanco las líneas `VAPID_…` si todavía no querés avisos al teléfono.

Preparar la carpeta de datos (la base y las fotos):

```bash
mkdir -p data
sudo chown 1000:1000 data
```

## Paso 10. Encender la aplicación

```bash
docker compose up -d --build
```

La primera vez tarda **entre 5 y 15 minutos** (descarga e instala todo y compila la app). Mientras tanto no cierres la ventana. Cuando termine:

```bash
docker compose ps
```

Tienen que figurar `app` y `caddy` como *running* (y `app` como *healthy* después de un minuto). Para ver lo que están haciendo:

```bash
docker compose logs -f
```

(Ctrl+C sale de los registros sin apagar nada.)

Abrí `https://sampachoconecta.duckdns.org` en el navegador. El certificado HTTPS puede tardar un minuto en emitirse la primera vez.

## Paso 11. Cargar los datos de prueba y probar todo

```bash
docker compose run --rm tools npm run seed -- --allow-production
```

Esto crea las cuentas de prueba (con la contraseña `SEED_PASSWORD`) y todo el contenido de ejemplo. Recorré la página con la guía de [`SEED_Y_PRODUCCION.md`](SEED_Y_PRODUCCION.md).

## Paso 12. Pasar al sitio real

Cuando termines de probar:

```bash
docker compose stop app
docker compose run --rm tools npm run seed -- --reset --yes --no-seed --allow-production
docker compose run --rm tools npm run create-admin -- --email=gestion@sampacho.gob.ar --name="Municipalidad de Sampacho"
docker compose start app
```

- La primera línea **detiene** la app (importante: no se debe vaciar la base mientras está funcionando).
- La segunda **borra** todos los datos y fotos de prueba y deja la base vacía.
- La tercera crea la primera cuenta real (con `ADMIN_PASSWORD`). Cambiá el email y el nombre por los reales.
- La cuarta vuelve a encender la app.

Después ingresá con esa cuenta, andá a **Panel → Usuarios** para asignar roles, y cargá los teléfonos útiles, las farmacias de turno, el cronograma de residuos y la guía del visitante.

## Paso 13. Copias de seguridad diarias

```bash
chmod +x backup.sh
./backup.sh
ls backups
```

Si aparece un archivo `sampacho-FECHA.tar.gz`, funciona. Para que se haga solo todos los días a las 4 de la mañana:

```bash
crontab -e
```

(Si pregunta qué editor usar, elegí `nano`.) Agregá al final esta línea y guardá:

```
0 4 * * * /home/ubuntu/sampachoconecta/deploy/backup.sh >> /home/ubuntu/backup.log 2>&1
```

Se guardan las últimas 14 copias. **Importante:** una copia que está solo en el mismo servidor no te salva si el servidor se pierde. De vez en cuando bajala a tu computadora, desde PowerShell en tu PC:

```powershell
scp -i $env:USERPROFILE\.ssh\oracle_sampacho "ubuntu@IP_PUBLICA:~/sampachoconecta/deploy/backups/*.tar.gz" .
```

**Para restaurar una copia:**

```bash
cd ~/sampachoconecta/deploy
docker compose stop app
tar xzf backups/sampacho-FECHA.tar.gz -C data
mv data/snapshot.sqlite data/sampacho.db
rm -f data/sampacho.db-wal data/sampacho.db-shm
docker compose start app
```

## Paso 14. Monitoreo gratuito (recomendado)

Creá una cuenta gratuita en [UptimeRobot](https://uptimerobot.com/) y agregá un monitor HTTPS a `https://sampachoconecta.duckdns.org/api/salud`. Te avisa por email si la página se cae. Además mantiene actividad en el servidor, lo que ayuda a que Oracle no lo considere inactivo.

## Actualizar la aplicación

Cuando haya cambios nuevos en GitHub:

```bash
cd ~/sampachoconecta
git pull
cd deploy
docker compose up -d --build
```

La carpeta `data` no se toca: los datos y las fotos se conservan.

## Avisos al teléfono (opcional)

1. Generá las claves en el servidor:

   ```bash
   docker compose run --rm tools node -e "console.log(require('web-push').generateVAPIDKeys())"
   ```

2. Copiá los valores a `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` en `.env` (`nano .env`).
3. Aplicá el cambio: `docker compose up -d`.

Funciona solo con HTTPS (que ya tenés) y cada vecino lo activa desde "Qué sigo".

---

## Cómo mantenerlo gratis

- Usá **una sola máquina** y solo recursos marcados *Always Free eligible*.
- No hagas "Upgrade to Pay As You Go".
- Revisá de vez en cuando **Billing → Cost analysis**: tiene que estar en cero.
- Oracle puede reclamar máquinas gratuitas que estén inactivas por mucho tiempo. El monitoreo del paso 14 ayuda. Verificá la política vigente en la documentación de Oracle.

## Problemas frecuentes

| Síntoma | Qué revisar |
|---|---|
| `Out of capacity` al crear la máquina | Reintentar en otro horario o en otro *Availability Domain* |
| La página no abre | 1) ¿La IP en DuckDNS es la de la máquina? 2) ¿Reglas de entrada 80/443 en Oracle (paso 4)? 3) ¿Reglas de `iptables` (paso 6)? 4) `docker compose logs caddy` |
| Error de certificado | Esperá unos minutos; confirmá que `DOMAIN` en `.env` es exactamente tu dirección, sin `https://` |
| `EACCES` o "permission denied" en los registros de la app | `cd ~/sampachoconecta/deploy && sudo chown -R 1000:1000 data && docker compose restart app` |
| La compilación se corta ("Killed") | Poca memoria. Creá un archivo de intercambio: `sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` y repetí `docker compose up -d --build` |
| Olvidaste una contraseña de cuenta | Con `ADMIN_PASSWORD` nueva: `docker compose run --rm tools npm run create-admin -- --email=EL_EMAIL --name="…"` (si el email ya existe, le actualiza la contraseña) |

## Qué hace rápida a esta instalación

- La base SQLite está en el mismo disco que la app: no hay red entre ellas.
- Next.js en modo `standalone`: arranca rápido y usa poca memoria.
- Caddy comprime las respuestas (zstd/gzip) y habilita HTTP/2 y HTTP/3.
- Las fotos se guardan en WebP comprimido y el navegador las conserva en caché.
- Más adelante, con un dominio propio, podés poner **Cloudflare** (plan gratuito) delante para repartir los archivos estáticos desde servidores cercanos a cada vecino.

## Para borrar todo

En la consola de Oracle: **Compute → Instances → tu máquina → Terminate** (marcá también borrar el volumen). Antes, bajá una copia de seguridad.
