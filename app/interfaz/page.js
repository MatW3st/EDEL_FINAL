"use client";
import React from "react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Form } from "react-bootstrap";
import Cookies from "js-cookie";
import axios from "axios";
import styles from "./interfaz.module.css";
import "bootstrap/dist/css/bootstrap.min.css";

// Definimos las URLs completas como constantes predefinidas
const API_BASE_URL_GET = "https://gatito027.vercel.app";
const API_BASE_URL_POST = "https://prueba-moleculer.vercel.app";
const SUCURSALES_URL = `${API_BASE_URL_GET}/obtener-sucursales`;
const PLANEACION_URL = `${API_BASE_URL_GET}/obtener-planeacion`;
const ADD_PLAN_URL = `${API_BASE_URL_POST}/api/add`;
const MODIFY_PLAN_URL_BASE = `${API_BASE_URL_POST}/api/modify/`;

// Lista blanca de URLs permitidas
const ALLOWED_URLS = [
  SUCURSALES_URL,
  PLANEACION_URL,
  ADD_PLAN_URL,
  MODIFY_PLAN_URL_BASE,
];

// Validar URLs para evitar problemas de seguridad
const isSafeUrl = (url) => {
  return ALLOWED_URLS.some((allowedUrl) => url.startsWith(allowedUrl));
};

// Función para sanitizar URLs y evitar inyecciones
const sanitizeUrl = (url) => {
  // Eliminar caracteres potencialmente peligrosos
  const sanitized = url.replace(/[^a-zA-Z0-9:/.-]/g, "");
  // Asegurarse de que la URL comience con el dominio esperado
  if (
    !sanitized.startsWith(API_BASE_URL_GET) &&
    !sanitized.startsWith(API_BASE_URL_POST)
  ) {
    throw new Error("URL no pertenece a un dominio permitido");
  }
  return sanitized;
};

export default function PlaneacionProduccion() {
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [filterOptions, setFilterOptions] = useState([]);
  const [planningData, setPlanningData] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("Todos");
  const [selectedSucursal, setSelectedSucursal] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planDate, setPlanDate] = useState("");
  const [dailyProduction, setDailyProduction] = useState("");
  const [productionUnit, setProductionUnit] = useState("Kg");
  const [selectedPlanSucursal, setSelectedPlanSucursal] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [editSucursal, setEditSucursal] = useState("");
  const [editFecha, setEditFecha] = useState("");
  const [editProduccion, setEditProduccion] = useState("");
  const [editEstado, setEditEstado] = useState("");
  const itemsPerPage = 5;
  const router = useRouter();

  const statusOptions = ["Todos", "Planeado", "En Proceso", "Completado"];

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    return date.toISOString().split("T")[0];
  };

  const handleApiError = (error, action, details = "") => {
    console.error(`Error al ${action}:`, error.message, details);
    setModalMessage(
      `❌ Error al ${action}. Detalles: ${error.message}${
        details ? ` - ${details}` : ""
      }`
    );
    setShowModal(true);
  };

  const fetchData = async (url, setter, errorAction) => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        throw new Error("No token found");
      }

      // Validar y sanitizar la URL
      const sanitizedUrl = sanitizeUrl(url);
      if (!isSafeUrl(sanitizedUrl)) {
        throw new Error("URL no permitida");
      }
      const allowedDomains = ["https://api.ejemplo.com", "https://otro-dominio.com"];

      try {
        const url = new URL(sanitizedUrl);
      
        // Verifica que el dominio esté en la lista de permitidos
        if (!allowedDomains.some(domain => url.origin === domain)) {
          throw new Error("Dominio no permitido.");
        }
      
        // Evita URLs locales o IPs internas
        if (
          url.hostname === "localhost" ||
          url.hostname.startsWith("192.168.") ||
          url.hostname.startsWith("10.") ||
          url.hostname.startsWith("172.")
        ) {
          throw new Error("Acceso a direcciones IP internas no permitido.");
        }
      
        // Realiza la solicitud HTTP solo si la URL es válida y segura
        const response = await axios.get(url.toString(), {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Cookie: `token=${token}`,
          },
        });
      
        console.log("Respuesta recibida:", response.data);
      
      } catch (error) {
        console.error("Error en la solicitud:", error.message);
      }
      
      const data = response.data;
      const sortedData = Array.isArray(data)
        ? data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        : [];
      setter(sortedData);
    } catch (error) {
      handleApiError(error, errorAction, `No se pudo conectar con ${url}`);
    }
  };

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchData(SUCURSALES_URL, setFilterOptions, "obtener las sucursales"),
        fetchData(PLANEACION_URL, setPlanningData, "obtener la planeación"),
      ]);
      setIsLoading(false);
    };

    loadData();
  }, [router]);

  const filterData = (data, status, sucursal, date) => {
    return data
      .filter((row) => status === "Todos" || row.estado === status)
      .filter((row) => sucursal === "" || row.nombre === sucursal)
      .filter((row) => {
        if (!date) return true;
        const rowDate = new Date(row.fecha);
        if (isNaN(rowDate.getTime())) return false;
        const selected = new Date(date);
        return (
          rowDate.getFullYear() === selected.getFullYear() &&
          rowDate.getMonth() === selected.getMonth()
        );
      });
  };

  const filteredData = useMemo(
    () =>
      filterData(planningData, selectedStatus, selectedSucursal, selectedDate),
    [planningData, selectedStatus, selectedSucursal, selectedDate]
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, selectedSucursal, selectedDate, planningData]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage]);

  const handleLogout = () => {
    setModalMessage("✅ ¿Estás seguro de que quieres cerrar sesión?");
    setShowModal(true);
  };

  const confirmLogout = () => {
    Cookies.remove("token");
    setShowModal(false);
    router.push("/login");
  };

  const handlePlanClick = () => {
    setShowPlanModal(true);
  };

  const handleClosePlanModal = () => {
    setShowPlanModal(false);
    setPlanDate("");
    setDailyProduction("");
    setProductionUnit("Kg");
    setSelectedPlanSucursal("");
  };

  // Funciones auxiliares para handleSavePlan
  const validatePlanInputs = (sucursal, date, production) => {
    if (!sucursal || !date || !production) {
      setModalMessage("⚠️ Por favor, completa todos los campos antes de guardar.");
      setShowModal(true);
      return false;
    }

    const productionValue = parseFloat(production);
    if (productionValue <= 0) {
      setModalMessage("⚠️ La producción diaria debe ser mayor que 0.");
      setShowModal(true);
      return false;
    }

    return true;
  };

  const getSucursalId = (sucursal) => {
    const sucursalId = filterOptions.find(
      (option) => option.nombre === sucursal
    )?.id;
    if (!sucursalId) {
      setModalMessage("⚠️ Sucursal no válida.");
      setShowModal(true);
      return null;
    }
    return sucursalId;
  };

  const convertProductionToKg = (production, unit) => {
    const productionValue = parseFloat(production);
    return unit === "Toneladas" ? productionValue * 1000 : productionValue;
  };

  const checkTokenAndRedirect = () => {
    const token = Cookies.get("token");
    if (!token) {
      setModalMessage(
        "⚠️ No se encontró un token de autenticación. Por favor, inicia sesión nuevamente."
      );
      setShowModal(true);
      router.push("/login");
      return false;
    }
    return token;
  };

  const handleSavePlan = async () => {
    // Validar entradas
    if (!validatePlanInputs(selectedPlanSucursal, planDate, dailyProduction)) {
      return;
    }

    // Obtener el ID de la sucursal
    const sucursalId = getSucursalId(selectedPlanSucursal);
    if (!sucursalId) return;

    // Convertir la producción a Kg
    const produccionEstimadaKg = convertProductionToKg(dailyProduction, productionUnit);

    const planData = {
      sucursal_id: sucursalId,
      fecha: planDate,
      produccion_estimada_kg: produccionEstimadaKg,
      estado: "Planeado",
    };

    try {
      const token = checkTokenAndRedirect();
      if (!token) return;

      const url = ADD_PLAN_URL;
      // Validar y sanitizar la URL
      const sanitizedUrl = sanitizeUrl(url);
      if (!isSafeUrl(sanitizedUrl)) {
        throw new Error("URL no permitida");
      }

      await axios.post(sanitizedUrl, planData, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Cookie: `token=${token}`,
        },
      });

      setModalMessage("✅ Planeación guardada y publicada exitosamente!");
      setShowModal(true);
      handleClosePlanModal();

      setIsLoading(true);
      await fetchData(PLANEACION_URL, setPlanningData, "obtener la planeación");
      setIsLoading(false);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setModalMessage(
          "⚠️ Tu sesión ha expirado. Por favor, inicia sesión nuevamente."
        );
        setShowModal(true);
        Cookies.remove("token");
        router.push("/login");
      } else {
        handleApiError(error, "guardar y publicar la planeación", error.message);
      }
    }
  };

  const handleViewClick = (row) => {
    setSelectedRow(row);
    setEditSucursal(row.nombre || "");
    setEditFecha(formatDateForInput(row.fecha));
    setEditProduccion(row.produccion_estimada_kg || "");
    setEditEstado(row.estado || "");
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedRow(null);
    setEditSucursal("");
    setEditFecha("");
    setEditProduccion("");
    setEditEstado("");
  };

  const handleUpdatePlan = async () => {
    if (!editSucursal || !editFecha || !editProduccion || !editEstado) {
      setModalMessage("⚠️ Por favor, completa todos los campos antes de actualizar.");
      setShowModal(true);
      return;
    }

    const productionValue = parseFloat(editProduccion);
    if (productionValue <= 0) {
      setModalMessage("⚠️ La producción estimada debe ser mayor que 0.");
      setShowModal(true);
      return;
    }

    const sucursalId = filterOptions.find(
      (option) => option.nombre === editSucursal
    )?.id;
    if (!sucursalId) {
      setModalMessage("⚠️ Sucursal no válida.");
      setShowModal(true);
      return;
    }

    const updatedPlanData = {
      id: selectedRow.id,
      sucursal_id: sucursalId,
      fecha: editFecha,
      produccion_estimada_kg: productionValue,
      estado: editEstado,
    };

    try {
      const token = checkTokenAndRedirect();
      if (!token) return;

      const url = `${MODIFY_PLAN_URL_BASE}${selectedRow.id}`;
      // Validar y sanitizar la URL
      const sanitizedUrl = sanitizeUrl(url);
      if (!isSafeUrl(sanitizedUrl)) {
        throw new Error("URL no permitida");
      }

      await axios.put(sanitizedUrl, updatedPlanData, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Cookie: `token=${token}`,
        },
      });

      setPlanningData((prevData) =>
        prevData.map((item) =>
          item.id === selectedRow.id
            ? {
                ...item,
                nombre: editSucursal,
                fecha: editFecha,
                produccion_estimada_kg: productionValue,
                estado: editEstado,
                sucursal_id: sucursalId,
              }
            : item
        )
      );

      setModalMessage("✅ Planeación actualizada exitosamente!");
      setShowModal(true);
      handleCloseViewModal();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setModalMessage(
          "⚠️ Tu sesión ha expirado. Por favor, inicia sesión nuevamente."
        );
        setShowModal(true);
        Cookies.remove("token");
        router.push("/login");
      } else {
        handleApiError(error, "actualizar la planeación", error.message);
      }
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className={styles.container}>
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>¡Atención!</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
          {modalMessage.includes("cerrar sesión") && (
            <Button variant="danger" onClick={confirmLogout}>
              Cerrar Sesión
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <Modal show={showPlanModal} onHide={handleClosePlanModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Asignar Planeación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="formSucursal">
              <Form.Label style={{ fontWeight: "bold" }}>Sucursal</Form.Label>
              <Form.Select
                value={selectedPlanSucursal}
                onChange={(e) => setSelectedPlanSucursal(e.target.value)}
              >
                <option value="">Selecciona una sucursal</option>
                {filterOptions.map((option) => (
                  <option key={option.id} value={option.nombre}>
                    {option.nombre}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formFecha">
              <Form.Label style={{ fontWeight: "bold" }}>Mes</Form.Label>
              <Form.Control
                type="date"
                value={planDate}
                onChange={(e) => setPlanDate(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="formProduccion">
              <Form.Label style={{ fontWeight: "bold" }}>
                Producción diaria
              </Form.Label>
              <div className="d-flex align-items-center">
                <Form.Control
                  type="number"
                  value={dailyProduction}
                  onChange={(e) => setDailyProduction(e.target.value)}
                  placeholder="Ingresa cantidad"
                  min="0"
                  className="me-2"
                />
                <Form.Select
                  value={productionUnit}
                  onChange={(e) => setProductionUnit(e.target.value)}
                >
                  <option value="Kg">Kg</option>
                  <option value="Toneladas">Toneladas</option>
                </Form.Select>
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={handleSavePlan}>
            Guardar
          </Button>
          <Button variant="secondary" onClick={handleClosePlanModal}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showViewModal} onHide={handleCloseViewModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar Planeación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRow ? (
            <Form>
              <Form.Group className="mb-3" controlId="formEditSucursal">
                <Form.Label style={{ fontWeight: "bold" }}>Sucursal</Form.Label>
                <Form.Select
                  value={editSucursal}
                  onChange={(e) => setEditSucursal(e.target.value)}
                >
                  <option value="">Selecciona una sucursal</option>
                  {filterOptions.map((option) => (
                    <option key={option.id} value={option.nombre}>
                      {option.nombre}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3" controlId="formEditFecha">
                <Form.Label style={{ fontWeight: "bold" }}>Fecha</Form.Label>
                <Form.Control
                  type="date"
                  value={editFecha}
                  onChange={(e) => setEditFecha(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formEditProduccion">
                <Form.Label style={{ fontWeight: "bold" }}>
                  Producción Estimada (Kg)
                </Form.Label>
                <Form.Control
                  type="number"
                  value={editProduccion}
                  onChange={(e) => setEditProduccion(e.target.value)}
                  placeholder="Ingresa cantidad"
                  min="0"
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formEditEstado">
                <Form.Label style={{ fontWeight: "bold" }}>Estado</Form.Label>
                <Form.Select
                  value={editEstado}
                  onChange={(e) => setEditEstado(e.target.value)}
                >
                  {statusOptions
                    .filter((status) => status !== "Todos")
                    .map((status, index) => (
                      <option key={index} value={status}>
                        {status}
                      </option>
                    ))}
                </Form.Select>
              </Form.Group>
            </Form>
          ) : (
            <p>No hay datos disponibles.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={handleUpdatePlan}>
            Actualizar
          </Button>
          <Button variant="secondary" onClick={handleCloseViewModal}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Planeación de Producción</h1>
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.filterGroup}>
            <span>Filtro por Sucursal:</span>
            <select
              className={styles.select}
              value={selectedSucursal}
              onChange={(e) => setSelectedSucursal(e.target.value)}
            >
              <option value="">Todos</option>
              {filterOptions.map((option) => (
                <option key={option.id} value={option.nombre}>
                  {option.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <span>Filtro por Estado:</span>
            <select
              className={styles.select}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {statusOptions.map((status, index) => (
                <option key={index} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.dateFilter}>
            <span>Mes y Año:</span>
            <input
              type="date"
              value={selectedDate || ""}
              onChange={(e) => setSelectedDate(e.target.value || null)}
            />
          </div>

          <Button variant="danger" onClick={handleLogout}>
            Cerrar Sesión
          </Button>
        </div>

        <div className={styles.planButtonContainer}>
          <Button variant="success" onClick={handlePlanClick}>
            + Planificar
          </Button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.productionTable}>
            <thead>
              <tr>
                <th>Sucursal</th>
                <th>Fecha</th>
                <th>Producción Estimada (Kg)</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5">Cargando datos...</td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row) => (
                  <tr key={row.id}>
                    <td>{row.nombre || "N/A"}</td>
                    <td>{formatDateForInput(row.fecha)}</td>
                    <td>{row.produccion_estimada_kg || "N/A"}</td>
                    <td>{row.estado || "N/A"}</td>
                    <td>
                      <Button variant="info" onClick={() => handleViewClick(row)}>
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">No hay datos disponibles</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <Button
              variant="primary"
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || isLoading}
            >
              Anterior
            </Button>
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="primary"
              onClick={handleNextPage}
              disabled={currentPage === totalPages || isLoading}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}