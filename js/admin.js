const {
    startAuthentication
} = SimpleWebAuthnBrowser;


const seguridadPanel =
    document.getElementById(
        "seguridadPanel"
    );

const panel =
    document.getElementById(
        "panel"
    );

const verificarBtn =
    document.getElementById(
        "verificarBtn"
    );

const adminNombre =
    document.getElementById(
        "adminNombre"
    );

const tipoPeriodo =
    document.getElementById(
        "tipoPeriodo"
    );

const fechaInput =
    document.getElementById(
        "fecha"
    );

const mesInput =
    document.getElementById(
        "mes"
    );

const campoDia =
    document.getElementById(
        "campoDia"
    );

const campoMes =
    document.getElementById(
        "campoMes"
    );

const departamentoSelect =
    document.getElementById(
        "departamento"
    );

const gradoSelect =
    document.getElementById(
        "grado"
    );

const buscarBtn =
    document.getElementById(
        "buscarBtn"
    );

const excelBtn =
    document.getElementById(
        "excelBtn"
    );

const pdfBtn =
    document.getElementById(
        "pdfBtn"
    );

const tablaBody =
    document.getElementById(
        "tablaBody"
    );

const mensajeEl =
    document.getElementById(
        "mensaje"
    );


let filasActuales = [];


// ======================================================
// FECHA ARGENTINA
// ======================================================

function fechaArgentina() {

    const partes =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone:
                    "America/Argentina/Buenos_Aires",

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit"
            }
        )
        .formatToParts(
            new Date()
        );


    const year =
        partes.find(
            p => p.type === "year"
        ).value;


    const month =
        partes.find(
            p => p.type === "month"
        ).value;


    const day =
        partes.find(
            p => p.type === "day"
        ).value;


    return `${year}-${month}-${day}`;

}


const hoy =
    fechaArgentina();


fechaInput.value =
    hoy;


mesInput.value =
    hoy.substring(
        0,
        7
    );


// ======================================================
// MENSAJES
// ======================================================

function mensaje(
    texto,
    error = false
) {

    mensajeEl.textContent =
        texto;


    mensajeEl.className =
        error
            ? "mensaje error"
            : "mensaje ok";

}


// ======================================================
// ESTADO ADMIN
// ======================================================

async function comprobarAdmin() {

    function obtenerAdminToken() {
    
        return localStorage.getItem(
            "admin_session"
        );
    
    }
    
    const {
        data,
        error
    } =
        await sb.rpc(
            "admin_estado",
            {

                p_token:
                    token,

                p_device_id:
                    obtenerDeviceId()

            }
        );


    if (
        error
        ||
        !data?.ok
    ) {

        adminNombre.textContent =
            data?.error
            ||
            "Acceso no autorizado";


        verificarBtn.disabled =
            true;


        return null;

    }


    adminNombre.textContent =
        `${data.apellido}, ${data.nombre}`;


    cargarDepartamentos(
        data.departamentos
    );


    return data;

}


// ======================================================
// DEPARTAMENTOS
// ======================================================

function cargarDepartamentos(
    departamentos
) {

    departamentoSelect.innerHTML =
        `
        <option value="">
            Todos
        </option>
        `;


    departamentos.forEach(
        dep => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                dep.id;


            option.textContent =
                dep.nombre;


            departamentoSelect
                .appendChild(
                    option
                );

        }
    );

}


// ======================================================
// WEBAUTHN
// ======================================================

async function llamarWebAuthn(
    action,
    extra = {}
) {

    const {
        data,
        error
    } =
        await sb.functions.invoke(
            "webauthn",
            {

                body: {

                    action,

                    token:
                        obtenerTokenSesion(),

                    device_id:
                        obtenerDeviceId(),

                    ...extra

                }

            }
        );


    if (error) {

        let texto =
            "Error de verificación.";


        try {

            const detalle =
                await error.context.json();


            texto =
                detalle.error
                || texto;

        } catch (_) {}


        throw new Error(
            texto
        );

    }


    if (!data?.ok) {

        throw new Error(
            data?.error
            ||
            "No se pudo verificar."
        );

    }


    return data;

}


async function verificarWebAuthn() {

    const inicio =
        await llamarWebAuthn(
            "auth-options"
        );


    const respuesta =
        await startAuthentication({

            optionsJSON:
                inicio.options

        });


    await llamarWebAuthn(
        "auth-verify",
        {

            response:
                respuesta

        }
    );

}


// ======================================================
// ENTRAR AL PANEL
// ======================================================

verificarBtn.addEventListener(
    "click",

    async () => {

        verificarBtn.disabled =
            true;


        verificarBtn.textContent =
            "Verificando...";


        try {

            await verificarWebAuthn();


            seguridadPanel.hidden =
                true;


            panel.hidden =
                false;


            await cargarReporte();


        } catch (error) {

            verificarBtn.disabled =
                false;


            verificarBtn.textContent =
                "Verificar identidad";


            alert(
                error.message
            );

        }

    }
);


// ======================================================
// PERÍODO
// ======================================================

tipoPeriodo.addEventListener(
    "change",

    () => {

        const mes =
            tipoPeriodo.value
            === "mes";


        campoDia.hidden =
            mes;


        campoMes.hidden =
            !mes;

    }
);


function rangoSeleccionado() {

    if (
        tipoPeriodo.value === "dia"
    ) {

        return {

            desde:
                fechaInput.value,

            hasta:
                fechaInput.value

        };

    }


    const [
        year,
        month
    ] =
        mesInput.value
            .split("-")
            .map(Number);


    const ultimoDia =
        new Date(
            year,
            month,
            0
        )
        .getDate();


    return {

        desde:
            `${year}-${String(month).padStart(2, "0")}-01`,

        hasta:
            `${year}-${String(month).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`

    };

}


// ======================================================
// REPORTE
// ======================================================

async function cargarReporte() {

    buscarBtn.disabled =
        true;


    mensaje(
        "Cargando información..."
    );


    try {

        const rango =
            rangoSeleccionado();


        const departamento =
            departamentoSelect.value
                ? Number(
                    departamentoSelect.value
                )
                : null;


        const grado =
            gradoSelect.value
                || null;


        const {
            data,
            error
        } =
            await sb.rpc(
                "admin_reporte_asistencias",
                {

                    p_token:
                        obtenerAdminToken(),

                    p_device_id:
                        obtenerDeviceId(),

                    p_desde:
                        rango.desde,

                    p_hasta:
                        rango.hasta,

                    p_departamento_id:
                        departamento,

                    p_grado:
                        grado

                }
            );


        if (error) {

            console.error(
                error
            );


            throw new Error(
                "No se pudo obtener el reporte."
            );

        }


        if (!data?.ok) {

            if (
                data?.requiere_webauthn
            ) {

                seguridadPanel.hidden =
                    false;

                panel.hidden =
                    true;

            }


            throw new Error(
                data?.error
                ||
                "No se pudo obtener el reporte."
            );

        }


        filasActuales =
            data.datos || [];


        mostrarTabla();


        mensaje("");


    } catch (error) {

        mensaje(
            error.message,
            true
        );

    }


    buscarBtn.disabled =
        false;

}


buscarBtn.addEventListener(
    "click",
    cargarReporte
);


// ======================================================
// HORAS
// ======================================================

function formatoHora(
    fecha
) {

    if (!fecha) {
        return "-";
    }


    return new Intl.DateTimeFormat(
        "es-AR",
        {

            hour:
                "2-digit",

            minute:
                "2-digit",

            timeZone:
                "America/Argentina/Buenos_Aires"

        }
    ).format(
        new Date(fecha)
    );

}


// ======================================================
// TABLA
// ======================================================

function mostrarTabla() {

    tablaBody.innerHTML =
        "";


    let departamentoAnterior =
        null;


    filasActuales.forEach(
        fila => {


            if (
                fila.departamento
                !== departamentoAnterior
            ) {

                departamentoAnterior =
                    fila.departamento;


                const encabezado =
                    document.createElement(
                        "tr"
                    );


                encabezado.className =
                    "departamento-row";


                encabezado.innerHTML =
                    `
                    <td colspan="8">
                        ${fila.departamento}
                    </td>
                    `;


                tablaBody.appendChild(
                    encabezado
                );

            }


            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML =
                `
                <td>
                    ${fila.fecha}
                </td>

                <td>
                    ${fila.grado || "-"}
                </td>

                <td>
                    ${fila.apellido}, ${fila.nombre}
                </td>

                <td>
                    ${fila.dni}
                </td>

                <td>
                    ${
                        fila.turno === "MANANA"
                            ? "Mañana"
                            : fila.turno === "TARDE"
                                ? "Tarde"
                                : "-"
                    }
                </td>

                <td>
                    ${formatoHora(fila.entrada)}
                </td>

                <td>
                    ${formatoHora(fila.salida)}
                </td>

                <td>
                    ${fila.estado}
                </td>
                `;


            tablaBody.appendChild(
                tr
            );

        }
    );


    const completos =
        filasActuales.filter(
            x =>
                x.estado === "COMPLETO"
        ).length;


    const sinEgreso =
        filasActuales.filter(
            x =>
                x.estado === "SIN EGRESO"
        ).length;


    const sinRegistro =
        filasActuales.filter(
            x =>
                x.estado === "SIN REGISTRO"
        ).length;


    document.getElementById(
        "cantidad"
    ).textContent =
        filasActuales.length;


    document.getElementById(
        "completos"
    ).textContent =
        completos;


    document.getElementById(
        "sinEgreso"
    ).textContent =
        sinEgreso;


    document.getElementById(
        "sinRegistro"
    ).textContent =
        sinRegistro;


    excelBtn.disabled =
        filasActuales.length === 0;


    pdfBtn.disabled =
        filasActuales.length === 0;

}


// ======================================================
// DATOS PARA EXPORTAR
// ======================================================

function datosExportacion() {

    return filasActuales.map(
        fila => ({

            Fecha:
                fila.fecha,

            Departamento:
                fila.departamento,

            Grado:
                fila.grado || "",

            DNI:
                fila.dni,

            Apellido:
                fila.apellido,

            Nombre:
                fila.nombre,

            Turno:
                fila.turno === "MANANA"
                    ? "Mañana"
                    : fila.turno === "TARDE"
                        ? "Tarde"
                        : "",

            Ingreso:
                formatoHora(
                    fila.entrada
                ),

            Egreso:
                formatoHora(
                    fila.salida
                ),

            Estado:
                fila.estado

        })
    );

}


// ======================================================
// EXCEL
// ======================================================

excelBtn.addEventListener(
    "click",

    () => {

        const datos =
            datosExportacion();


        const hoja =
            XLSX.utils
                .json_to_sheet(
                    datos
                );


        const libro =
            XLSX.utils
                .book_new();


        XLSX.utils
            .book_append_sheet(
                libro,
                hoja,
                "Asistencias"
            );


        XLSX.writeFile(
            libro,
            "asistencias.xlsx"
        );

    }
);


// ======================================================
// PDF
// ======================================================

pdfBtn.addEventListener(
    "click",

    () => {

        const {
            jsPDF
        } =
            window.jspdf;


        const doc =
            new jsPDF({
                orientation:
                    "landscape"
            });


        doc.setFontSize(15);


        doc.text(
            "Reporte de asistencias",
            14,
            15
        );


        const filas =
            datosExportacion()
                .map(
                    x => [

                        x.Fecha,

                        x.Departamento,

                        x.Grado,

                        `${x.Apellido}, ${x.Nombre}`,

                        x.DNI,

                        x.Turno,

                        x.Ingreso,

                        x.Egreso,

                        x.Estado

                    ]
                );


        doc.autoTable({

            startY:
                22,

            head: [[

                "Fecha",

                "Departamento",

                "Grado",

                "Apellido y nombre",

                "DNI",

                "Turno",

                "Ingreso",

                "Egreso",

                "Estado"

            ]],

            body:
                filas,

            styles: {
                fontSize: 7
            }

        });


        doc.save(
            "asistencias.pdf"
        );

    }
);


// ======================================================
// INICIO
// ======================================================

comprobarAdmin();
