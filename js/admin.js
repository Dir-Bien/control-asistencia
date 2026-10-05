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

const mensajeEl =
    document.getElementById("mensaje");

const contenidoAsistencias =
    document.getElementById("contenidoAsistencias");

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
// ESCAPAR HTML
// ======================================================

function escaparHTML(
    texto
) {

    return String(
        texto ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        );

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


        if (
            error
            ||
            !data?.ok
        ) {

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


        mensaje(
            "No se pudo cargar el panel.",
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

        const option =
            document.createElement(
                "option"
            );


        option.value =
            "";


        option.textContent =
            "Todos";


        departamentoSelect
            .appendChild(
                option
            );

    }


    departamentos.forEach(
        departamento => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                departamento.id;


            option.textContent =
                departamento.nombre;


            departamentoSelect
                .appendChild(
                    option
                );

        }
    );


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
// CAMBIO DE VISTA
// ======================================================

tipoPeriodo.addEventListener(
    "change",
    () => {

        const esMes =
            tipoPeriodo.value ===
            "mes";


        campoDia.hidden =
            esMes;


        campoMes.hidden =
            !esMes;


        cargarReporte();

    }
);


// ======================================================
// RANGO
// ======================================================

function rangoSeleccionado() {

    if (
        tipoPeriodo.value ===
        "dia"
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

            throw new Error(
                data?.error
                ||
                "No se pudo obtener el reporte."
            );

        }


        filasActuales =
            data.datos
            || [];


        actualizarResumen();


        if (
            tipoPeriodo.value ===
            "mes"
        ) {

            mostrarVistaMes();

        } else {

            mostrarVistaDia();

        }


        excelBtn.disabled =
            filasActuales.length === 0;


        pdfBtn.disabled =
            filasActuales.length === 0;


        mensaje("");


    } catch (error) {

        console.error(
            error
        );


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
// AGRUPAR POR DEPARTAMENTO
// ======================================================

function agruparPorDepartamento() {

    const grupos =
        {};


    filasActuales.forEach(
        fila => {

            const departamento =
                fila.departamento
                || "Sin departamento";


            if (
                !grupos[
                    departamento
                ]
            ) {

                grupos[
                    departamento
                ] = [];

            }


            grupos[
                departamento
            ].push(
                fila
            );

        }
    );


    return grupos;

}


// ======================================================
// RESUMEN
// ======================================================

function actualizarResumen() {

    const personas =
        new Set();


    filasActuales.forEach(
        fila => {

            personas.add(
                fila.dni
            );

        }
    );


    const completos =
        filasActuales.filter(
            fila =>
                fila.estado ===
                "COMPLETO"
        ).length;


    const sinEgreso =
        filasActuales.filter(
            fila =>
                fila.estado ===
                "SIN EGRESO"
        ).length;


    const sinRegistro =
        filasActuales.filter(
            fila =>
                fila.estado ===
                "SIN REGISTRO"
        ).length;


    document
        .getElementById(
            "cantidad"
        )
        .textContent =
            personas.size;


    document
        .getElementById(
            "completos"
        )
        .textContent =
            completos;


    document
        .getElementById(
            "sinEgreso"
        )
        .textContent =
            sinEgreso;


    document
        .getElementById(
            "sinRegistro"
        )
        .textContent =
            sinRegistro;

}


// ======================================================
// VISTA DÍA
// ======================================================

function mostrarVistaDia() {

    contenidoAsistencias
        .innerHTML =
            "";


    const grupos =
        agruparPorDepartamento();


    Object
        .keys(grupos)
        .sort()
        .forEach(
            departamento => {

                const filas =
                    grupos[
                        departamento
                    ];


                const contenedor =
                    document.createElement(
                        "section"
                    );


                contenedor.className =
                    "departamento-card";


                let html =
                    `

                    <div class="departamento-header">

                        <div>

                            <h2>
                                ${escaparHTML(departamento)}
                            </h2>

                            <span>
                                ${filas.length} personas
                            </span>

                        </div>

                    </div>


                    <div class="tabla-wrapper">

                        <table class="tabla-dia">

                            <thead>

                                <tr>

                                    <th>
                                        Grado
                                    </th>

                                    <th>
                                        Apellido y nombre
                                    </th>

                                    <th>
                                        DNI
                                    </th>

                                    <th>
                                        Turno
                                    </th>

                                    <th>
                                        Ingreso
                                    </th>

                                    <th>
                                        Egreso
                                    </th>

                                    <th>
                                        Estado
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                    `;


                filas
                    .sort(
                        (
                            a,
                            b
                        ) => {

                            return a.apellido
                                .localeCompare(
                                    b.apellido
                                );

                        }
                    )
                    .forEach(
                        fila => {

                            let turno =
                                "-";


                            if (
                                fila.turno ===
                                "MANANA"
                            ) {

                                turno =
                                    "Mañana";

                            }


                            if (
                                fila.turno ===
                                "TARDE"
                            ) {

                                turno =
                                    "Tarde";

                            }


                            const claseEstado =
                                obtenerClaseEstado(
                                    fila.estado
                                );


                            html +=
                                `

                                <tr>

                                    <td>
                                        ${escaparHTML(fila.grado || "-")}
                                    </td>

                                    <td class="persona">
                                        ${escaparHTML(fila.apellido)},
                                        ${escaparHTML(fila.nombre)}
                                    </td>

                                    <td>
                                        ${escaparHTML(fila.dni)}
                                    </td>

                                    <td>
                                        ${turno}
                                    </td>

                                    <td class="hora">
                                        ${formatoHora(fila.entrada)}
                                    </td>

                                    <td class="hora">
                                        ${formatoHora(fila.salida)}
                                    </td>

                                    <td>

                                        <span class="estado ${claseEstado}">
                                            ${fila.estado}
                                        </span>

                                    </td>

                                </tr>

                                `;

                        }
                    );


                html +=
                    `

                            </tbody>

                        </table>

                    </div>

                    `;


                contenedor.innerHTML =
                    html;


                contenidoAsistencias
                    .appendChild(
                        contenedor
                    );

            }
        );

}


// ======================================================
// VISTA MES
// ======================================================

function mostrarVistaMes() {

    contenidoAsistencias
        .innerHTML =
            "";


    const grupos =
        agruparPorDepartamento();


    Object
        .keys(grupos)
        .sort()
        .forEach(
            departamento => {

                const filas =
                    grupos[
                        departamento
                    ];


                const personas =
                    agruparPersonasMes(
                        filas
                    );


                const dias =
                    obtenerDiasDelMes(
                        filas
                    );


                const contenedor =
                    document.createElement(
                        "section"
                    );


                contenedor.className =
                    "departamento-card";


                let html =
                    `

                    <div class="departamento-header">

                        <div>

                            <h2>
                                ${escaparHTML(departamento)}
                            </h2>

                            <span>
                                ${personas.length} personas
                            </span>

                        </div>

                        <div class="leyenda">

                            <span class="leyenda-item leyenda-completo">
                                Completo
                            </span>

                            <span class="leyenda-item leyenda-pendiente">
                                Sin egreso
                            </span>

                            <span class="leyenda-item leyenda-faltante">
                                Sin registro
                            </span>

                        </div>

                    </div>


                    <div class="tabla-wrapper mensual">

                        <table class="tabla-mes">

                            <thead>

                                <tr>

                                    <th class="sticky-col grado-col">
                                        Grado
                                    </th>

                                    <th class="sticky-col nombre-col">
                                        Personal
                                    </th>

                    `;


                dias.forEach(
                    fecha => {

                        const dia =
                            Number(
                                fecha
                                    .split("-")[2]
                            );


                        const nombreDia =
                            obtenerNombreDia(
                                fecha
                            );


                        html +=
                            `

                            <th class="dia-col">

                                <span class="numero-dia">
                                    ${dia}
                                </span>

                                <span class="nombre-dia">
                                    ${nombreDia}
                                </span>

                            </th>

                            `;

                    }
                );


                html +=
                    `

                                </tr>

                            </thead>

                            <tbody>

                    `;


                personas.forEach(
                    persona => {

                        html +=
                            `

                            <tr>

                                <td class="sticky-col grado-col">
                                    ${escaparHTML(persona.grado || "-")}
                                </td>

                                <td class="sticky-col nombre-col persona-mes">

                                    <strong>
                                        ${escaparHTML(persona.apellido)},
                                        ${escaparHTML(persona.nombre)}
                                    </strong>

                                    <small>
                                        ${escaparHTML(persona.dni)}
                                    </small>

                                </td>

                        `;


                        dias.forEach(
                            fecha => {

                                const registro =
                                    persona
                                        .dias[
                                            fecha
                                        ];


                                html +=
                                    crearCeldaMes(
                                        registro
                                    );

                            }
                        );


                        html +=
                            `

                            </tr>

                            `;

                    }
                );


                html +=
                    `

                            </tbody>

                        </table>

                    </div>

                    `;


                contenedor.innerHTML =
                    html;


                contenidoAsistencias
                    .appendChild(
                        contenedor
                    );

            }
        );

}


// ======================================================
// AGRUPAR PERSONAS MES
// ======================================================

function agruparPersonasMes(
    filas
) {

    const personas =
        {};


    filas.forEach(
        fila => {

            const clave =
                fila.dni;


            if (
                !personas[
                    clave
                ]
            ) {

                personas[
                    clave
                ] = {

                    dni:
                        fila.dni,

                    grado:
                        fila.grado,

                    apellido:
                        fila.apellido,

                    nombre:
                        fila.nombre,

                    dias:
                        {}

                };

            }


            personas[
                clave
            ].dias[
                fila.fecha
            ] =
                fila;

        }
    );


    return Object
        .values(
            personas
        )
        .sort(
            (
                a,
                b
            ) => {

                return a.apellido
                    .localeCompare(
                        b.apellido
                    );

            }
        );

}


// ======================================================
// DÍAS DEL MES
// ======================================================

function obtenerDiasDelMes(
    filas
) {

    return [
        ...new Set(
            filas.map(
                fila =>
                    fila.fecha
            )
        )
    ].sort();

}


function obtenerNombreDia(
    fecha
) {

    const [
        year,
        month,
        day
    ] =
        fecha
            .split("-")
            .map(Number);


    const fechaLocal =
        new Date(
            year,
            month - 1,
            day
        );


    const nombre =
        new Intl.DateTimeFormat(
            "es-AR",
            {
                weekday:
                    "short"
            }
        )
        .format(
            fechaLocal
        );


    return nombre
        .replace(
            ".",
            ""
        );

}


// ======================================================
// CELDA MES
// ======================================================

function crearCeldaMes(
    registro
) {

    if (
        !registro
        ||
        registro.estado ===
        "SIN REGISTRO"
    ) {

        return `

            <td class="dia-celda sin-registro">

                <span class="sin-dato">
                    —
                </span>

            </td>

        `;

    }


    const entrada =
        formatoHora(
            registro.entrada
        );


    const salida =
        registro.salida
            ? formatoHora(
                registro.salida
            )
            : "--:--";


    const clase =
        registro.estado ===
        "COMPLETO"
            ? "completo"
            : "sin-egreso";


    return `

        <td class="dia-celda ${clase}">

            <span class="hora-entrada">
                ${entrada}
            </span>

            <span class="separador-horas">
                /
            </span>

            <span class="hora-salida">
                ${salida}
            </span>

        </td>

    `;

}


// ======================================================
// CLASE ESTADO
// ======================================================

function obtenerClaseEstado(
    estado
) {

    if (
        estado ===
        "COMPLETO"
    ) {

        return "estado-completo";

    }


    if (
        estado ===
        "SIN EGRESO"
    ) {

        return "estado-pendiente";

    }


    return "estado-faltante";

}


// ======================================================
// EXCEL
// ======================================================

excelBtn.addEventListener(
    "click",
    () => {

        if (
            tipoPeriodo.value ===
            "mes"
        ) {

            exportarExcelMes();

        } else {

            exportarExcelDia();

        }

    }
);


function exportarExcelDia() {

    const libro =
        XLSX.utils
            .book_new();


    const grupos =
        agruparPorDepartamento();


    Object
        .keys(grupos)
        .forEach(
            departamento => {

                const datos =
                    grupos[
                        departamento
                    ].map(
                        fila => ({

                            Grado:
                                fila.grado,

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


                const hoja =
                    XLSX.utils
                        .json_to_sheet(
                            datos
                        );


                XLSX.utils
                    .book_append_sheet(
                        libro,
                        hoja,
                        nombreHojaExcel(
                            departamento
                        )
                    );

            }
        );


    XLSX.writeFile(
        libro,
        `asistencia_${fechaInput.value}.xlsx`
    );

}


function exportarExcelMes() {

    const libro =
        XLSX.utils
            .book_new();


    const grupos =
        agruparPorDepartamento();


    Object
        .keys(grupos)
        .forEach(
            departamento => {

                const filas =
                    grupos[
                        departamento
                    ];


                const personas =
                    agruparPersonasMes(
                        filas
                    );


                const dias =
                    obtenerDiasDelMes(
                        filas
                    );


                const datos =
                    personas.map(
                        persona => {

                            const fila = {

                                Grado:
                                    persona.grado,

                                DNI:
                                    persona.dni,

                                Personal:
                                    `${persona.apellido}, ${persona.nombre}`

                            };


                            dias.forEach(
                                fecha => {

                                    const dia =
                                        Number(
                                            fecha
                                                .split("-")[2]
                                        );


                                    const registro =
                                        persona
                                            .dias[
                                                fecha
                                            ];


                                    if (
                                        !registro
                                        ||
                                        !registro.entrada
                                    ) {

                                        fila[
                                            `Día ${dia}`
                                        ] =
                                            "-";

                                    } else {

                                        fila[
                                            `Día ${dia}`
                                        ] =
                                            `${formatoHora(registro.entrada)} / ${registro.salida ? formatoHora(registro.salida) : "--:--"}`;

                                    }

                                }
                            );


                            return fila;

                        }
                    );


                const hoja =
                    XLSX.utils
                        .json_to_sheet(
                            datos
                        );


                XLSX.utils
                    .book_append_sheet(
                        libro,
                        hoja,
                        nombreHojaExcel(
                            departamento
                        )
                    );

            }
        );


    XLSX.writeFile(
        libro,
        `asistencia_${mesInput.value}.xlsx`
    );

}


function nombreHojaExcel(
    nombre
) {

    return nombre
        .replace(
            /[\\/?*[\]:]/g,
            ""
        )
        .substring(
            0,
            31
        )
        ||
        "Departamento";

}


// ======================================================
// PDF
// ======================================================

pdfBtn.addEventListener(
    "click",
    () => {

        if (
            tipoPeriodo.value ===
            "mes"
        ) {

            exportarPDFMes();

        } else {

            exportarPDFDia();

        }

    }
);


function exportarPDFDia() {

    const {
        jsPDF
    } =
        window.jspdf;


    const doc =
        new jsPDF({
            orientation:
                "landscape"
        });


    const grupos =
        agruparPorDepartamento();


    let primerDepartamento =
        true;


    Object
        .keys(grupos)
        .forEach(
            departamento => {

                if (
                    !primerDepartamento
                ) {

                    doc.addPage();

                }


                primerDepartamento =
                    false;


                doc.setFontSize(
                    15
                );


                doc.text(
                    departamento,
                    14,
                    15
                );


                const filas =
                    grupos[
                        departamento
                    ].map(
                        fila => [

                            fila.grado || "",

                            `${fila.apellido}, ${fila.nombre}`,

                            fila.dni,

                            fila.turno === "MANANA"
                                ? "Mañana"
                                : fila.turno === "TARDE"
                                    ? "Tarde"
                                    : "",

                            formatoHora(
                                fila.entrada
                            ),

                            formatoHora(
                                fila.salida
                            ),

                            fila.estado

                        ]
                    );


                doc.autoTable({

                    startY:
                        22,

                    head: [[

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
                        fontSize: 8
                    }

                });

            }
        );


    doc.save(
        `asistencia_${fechaInput.value}.pdf`
    );

}


function exportarPDFMes() {

    const {
        jsPDF
    } =
        window.jspdf;


    const doc =
        new jsPDF({

            orientation:
                "landscape",

            format:
                "a3"

        });


    const grupos =
        agruparPorDepartamento();


    let primerDepartamento =
        true;


    Object
        .keys(grupos)
        .forEach(
            departamento => {

                if (
                    !primerDepartamento
                ) {

                    doc.addPage();

                }


                primerDepartamento =
                    false;


                const filas =
                    grupos[
                        departamento
                    ];


                const personas =
                    agruparPersonasMes(
                        filas
                    );


                const dias =
                    obtenerDiasDelMes(
                        filas
                    );


                doc.setFontSize(
                    14
                );


                doc.text(
                    `${departamento} - ${mesInput.value}`,
                    10,
                    12
                );


                const encabezado = [

                    "Grado",

                    "Personal",

                    ...dias.map(
                        fecha =>
                            Number(
                                fecha
                                    .split("-")[2]
                            )
                    )

                ];


                const body =
                    personas.map(
                        persona => [

                            persona.grado
                            || "",

                            `${persona.apellido}, ${persona.nombre}`,

                            ...dias.map(
                                fecha => {

                                    const registro =
                                        persona
                                            .dias[
                                                fecha
                                            ];


                                    if (
                                        !registro
                                        ||
                                        !registro.entrada
                                    ) {

                                        return "-";

                                    }


                                    return `${formatoHora(registro.entrada)}\n${registro.salida ? formatoHora(registro.salida) : "--"}`;

                                }
                            )

                        ]
                    );


                doc.autoTable({

                    startY:
                        18,

                    head: [
                        encabezado
                    ],

                    body,

                    theme:
                        "grid",

                    styles: {

                        fontSize:
                            5,

                        cellPadding:
                            1

                    },

                    columnStyles: {

                        0: {
                            cellWidth: 12
                        },

                        1: {
                            cellWidth: 38
                        }

                    }

                });

            }
        );


    doc.save(
        `asistencia_${mesInput.value}.pdf`
    );

}


// ======================================================
// CERRAR SESIÓN
// ======================================================

cerrarSesionBtn
    .addEventListener(
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
