import { C, PAYMENT_STATUS_COLOR } from "../../constants/theme";
import { Badge } from "../../components/ui";

const fmt = (n) =>
  n !== undefined && n !== null
    ? `₹${Number(n).toLocaleString("en-IN")}`
    : "—";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

/**
 * ResidentPaymentCard
 *
 * Shown inside BillDetailView when the viewer is a resident.
 * Backend already returns only their own payment record in bill.payments[0],
 * so this component just needs to render it cleanly.
 *
 * Props:
 *   payment  — single payment sub-document (bill.payments[0])
 *   bill     — parent bill (for due date, title context)
 */
export const ResidentPaymentCard = ({ payment, bill }) => {
  if (!payment) {
    return (
      <div style={{
        background: C.gray50, borderRadius: 14, padding: "24px 20px",
        textAlign: "center", border: `1.5px dashed ${C.gray200}`,
        marginTop: 8,
      }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.gray700, marginBottom: 4 }}>
          No record found
        </div>
        <div style={{ fontSize: 12, color: C.gray500, lineHeight: 1.6 }}>
          You don't have a payment record for this bill.
          This may be because it targets specific flats only.
          Contact your society admin if you believe this is an error.
        </div>
      </div>
    );
  }

  const sc     = PAYMENT_STATUS_COLOR[payment.status] || {};
  const isPaid = payment.status === "paid" || payment.status === "waived";
  const isOverdue = payment.status === "overdue";

  return (
    <div style={{ marginTop: 8 }}>
      {/* Status banner */}
      <div style={{
        borderRadius: 14, padding: "16px 18px", marginBottom: 14,
        background: isPaid
          ? `linear-gradient(135deg, ${C.green}18, ${C.teal}18)`
          : isOverdue
            ? `linear-gradient(135deg, ${C.red}12, ${C.amber}12)`
            : `linear-gradient(135deg, ${C.navy}10, ${C.teal}10)`,
        border: `1.5px solid ${isPaid ? C.green : isOverdue ? C.red : C.teal}25`,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{ fontSize: 36 }}>
          {isPaid ? "✅" : isOverdue ? "⚠️" : "⏳"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontFamily: "Syne", fontWeight: 800,
            color: isPaid ? C.green : isOverdue ? C.red : C.navy }}>
            {fmt(isPaid ? (payment.paidAmount || payment.totalDue) : payment.totalDue)}
          </div>
          <div style={{ marginTop: 4 }}>
            <Badge
              label={payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
              bg={sc.bg} text={sc.text} dot={sc.dot}
            />
          </div>
        </div>
      </div>

      {/* Amount breakdown */}
      <div style={{
        background: "#fff", borderRadius: 14, padding: "14px 16px",
        border: `1px solid ${C.gray100}`, marginBottom: 14,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.gray500,
          textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
          Amount Breakdown
        </div>

        {[
          ["Base Amount",    fmt(payment.amount),   C.text],
          payment.penalty > 0  && ["Late Penalty",  `+ ${fmt(payment.penalty)}`,  C.red],
          payment.discount > 0 && ["Discount",      `- ${fmt(payment.discount)}`, C.green],
          ["Total Due",     fmt(payment.totalDue),  C.navy],
        ].filter(Boolean).map(([label, value, color], i, arr) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 0",
            borderBottom: i < arr.length - 1 ? `1px solid ${C.gray100}` : "none",
            borderTop: label === "Total Due" ? `2px solid ${C.gray100}` : "none",
          }}>
            <span style={{ fontSize: 13, color: C.gray600, fontWeight: label === "Total Due" ? 700 : 500 }}>
              {label}
            </span>
            <span style={{ fontSize: 14, color, fontWeight: label === "Total Due" ? 800 : 600 }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Due date reminder (only if unpaid) */}
      {!isPaid && (
        <div style={{
          background: isOverdue ? C.red + "10" : C.amber + "10",
          border: `1px solid ${isOverdue ? C.red : C.amber}25`,
          borderRadius: 12, padding: "10px 14px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>{isOverdue ? "🔴" : "📅"}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: isOverdue ? C.red : C.amber }}>
              {isOverdue ? "Payment Overdue" : "Due Date"}
            </div>
            <div style={{ fontSize: 12, color: C.gray700 }}>
              {fmtDate(bill?.dueDate)}
              {isOverdue && " — please pay as soon as possible."}
            </div>
          </div>
        </div>
      )}

      {/* Payment receipt (only if paid) */}
      {isPaid && (
        <div style={{
          background: C.green + "08", border: `1px solid ${C.green}20`,
          borderRadius: 12, padding: "12px 14px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 8 }}>
            ✅ Payment Receipt
          </div>
          {[
            ["Paid On",    fmtDate(payment.paidAt)],
            ["Method",     payment.paymentMethod?.toUpperCase()],
            payment.transactionId && ["Reference", payment.transactionId],
            payment.receiptNote   && ["Note",      payment.receiptNote],
          ].filter(Boolean).map(([label, value]) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "5px 0", borderBottom: `1px solid ${C.green}15`,
            }}>
              <span style={{ fontSize: 12, color: C.gray500 }}>{label}</span>
              <span style={{ fontSize: 12, color: C.text, fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
