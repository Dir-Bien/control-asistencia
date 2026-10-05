const panel =
    document.getElementById("panel");

const adminNombre =
    document.getElementById("adminNombre");

const tipoPeriodo =
    document.getElementById("tipoPeriodo");

const fechaInput =
    document.getElementById("fecha");

const mesInput =
    document.getElementById("mes");

const campoDia =
    document.getElementById("campoDia");

const campoMes =
    document.getElementById("campoMes");

const departamentoSelect =
    document.getElementById("departamento");

const gradoSelect =
    document.getElementById("grado");

const buscarBtn =
    document.getElementById("buscarBtn");

const excelBtn =
    document.getElementById("excelBtn");

const pdfBtn =
    document.getElementById("pdfBtn");

const tablaBody =
    document.getElementById("tablaBody");

const mensajeEl =
    document.getElementById("mensaje");

const cerrarSesionBtn =
    document.getElementById("cerrarSesionBtn");


let filasActuales = [];

let adminActual = null;


// ======================================================
// ADMIN TOKEN
// ======================================================

function obtenerAdminToken() {

    return localStorage.getItem(
        "admin_session"
    );

}


// ======================================================
// FECHA DE ARGENTINA
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
// COMPROBAR ADMIN
// ======================================================

async function comprobarAdmin() {

    const token =
        obtenerAdminToken();


    if (!token) {

        window.location.replace(
            "admin-login.html"
        );

        return;
    }


    try {

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


        if (error) {

            console.error(
                error
            );

            throw new Error(
                "No se pudo verificar la sesión."
            );

        }


        if (!data?.ok) {

            localStorage.removeItem(
                "admin_session"
            );


            window.location.replace(
                "admin-login.html"
            );

            return;

        }


        adminActual =
            data;


        adminNombre.textContent =
            `Usuario: ${data.usuario}`;


        cargarDepartamentos(
            data.departamentos
        );


        panel.hidden =
            false;


        await cargarReporte();


    } catch (error) {

        console.error(
            error
        );


        adminNombre.textContent =
            "Acceso no autorizado";


        mensaje(
            error.message,
            true
        );

    }

}


// ======================================================
// DEPARTAMENTOS
// ======================================================

function cargarDepartamentos(
    departamentos
) {

    departamentoSelect.innerHTML =
        "";


    if (
        adminActual.departamento_id === 0
    ) {

        const todos =
            document.createElement(
                "option"
            );


        todos.value =
            "";


        todos.textContent =
            "Todos";


        departamentoSelect
            .appendChild(
                todos
            );

    }


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


    // Si el admin pertenece a un solo departamento,
    // no puede cambiarlo.

    if (
        adminActual.departamento_id !== 0
    ) {

        departamentoSelect.value =
            String(
                adminActual.departamento_id
            );


        departamentoSelect.disabled =
            true;

    }

}


// ======================================================
// PERÍODO
// ======================================================

tipoPeriodo.addEventListener(
    "change",

    () => {

        const esMes =
            tipoPeriodo.value
            === "mes";


        campoDia.hidden =
            esMes;


        campoMes.hidden =
            !esMes;

    }
);


function rangoSeleccionado() {

    if (
        tipoPeriodo.value
        === "dia"
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
// CARGAR REPORTE
// ======================================================

async function cargarReporte() {

    buscarBtn.disabled =
        true;


    mensaje(
        "Cargando..."
    );


    try {

        const rango =
            rangoSeleccionado();


        let departamento =
            null;


        if (
            departamentoSelect.value
        ) {

            departamento =
                Number(
                    departamentoSelect.value
                );

        }


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

            throw new Error(
                data?.error
                ||
                "No se pudo obtener el reporte."
            );

        }


        filasActuales =
            data.datos
            || [];


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
// FORMATO HORA
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


    filasActuales.forEach(
        fila => {

            const tr =
                document.createElement(
                    "tr"
                );


            let turno =
                "-";


            if (
                fila.turno === "MANANA"
            ) {

                turno =
                    "Mañana";

            }


            if (
                fila.turno === "TARDE"
            ) {

                turno =
                    "Tarde";

            }


            tr.innerHTML =
                `

                <td>
                    ${fila.fecha}
                </td>

                <td>
                    ${fila.departamento}
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
                    ${turno}
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


            tablaBody
                .appendChild(
                    tr
                );

        }
    );


    const completos =
        filasActuales.filter(
            fila =>
                fila.estado
                === "COMPLETO"
        ).length;


    const sinEgreso =
        filasActuales.filter(
            fila =>
                fila.estado
                === "SIN EGRESO"
        ).length;


    const sinRegistro =
        filasActuales.filter(
            fila =>
                fila.estado
                === "SIN REGISTRO"
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
// EXPORTAR
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

        const hoja =
            XLSX.utils
                .json_to_sheet(
                    datosExportacion()
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


        doc.text(
            "Reporte de asistencias",
            14,
            15
        );


        const filas =
            datosExportacion()
                .map(
                    dato => [

                        dato.Fecha,

                        dato.Departamento,

                        dato.Grado,

                        `${dato.Apellido}, ${dato.Nombre}`,

                        dato.DNI,

                        dato.Turno,

                        dato.Ingreso,

                        dato.Egreso,

                        dato.Estado

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
// CERRAR SESIÓN ADMIN
// ======================================================

cerrarSesionBtn.addEventListener(
    "click",

    () => {

        localStorage.removeItem(
            "admin_session"
        );


        window.location.replace(
            "admin-login.html"
        );

    }
);


// ======================================================
// INICIO
// ======================================================

comprobarAdmin();
