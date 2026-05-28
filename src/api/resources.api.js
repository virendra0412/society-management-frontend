import client, { unwrap } from "./client";

// ─────────────────────────────────────────────────────────────────────────────
//  AUTH EXTRAS  (forgot / reset password)
//  Used by: LoginScreen
// ─────────────────────────────────────────────────────────────────────────────
export const authExtrasApi = {
  forgotPassword: (email) =>
    client.post("/auth/forgot-password", { email }).then(unwrap),

  resetPassword: (email, otp, newPassword) =>
    client.post("/auth/reset-password", { email, otp, newPassword }).then(unwrap),
};

// ─────────────────────────────────────────────────────────────────────────────
//  USER / PROFILE
//  Used by: ProfileScreen, AdminScreen
// ─────────────────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile:    ()        => client.get("/users/profile").then(unwrap),
  updateProfile: (payload) => client.patch("/users/profile", payload).then(unwrap),

  // Avatar — multipart/form-data, field name: "avatar"
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return client.post("/users/profile/avatar", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(unwrap);
  },

  // Family members
  addFamilyMember:    (payload)           => client.post("/users/profile/family", payload).then(unwrap),
  updateFamilyMember: (memberId, payload) => client.patch(`/users/profile/family/${memberId}`, payload).then(unwrap),
  removeFamilyMember: (memberId)          => client.delete(`/users/profile/family/${memberId}`).then(unwrap),

  // Admin — member approval
  getPendingMembers: ()       => client.get("/users/pending").then(unwrap),
  approveMember:     (userId) => client.patch(`/users/${userId}/approve`).then(unwrap),
  rejectMember:      (userId) => client.patch(`/users/${userId}/reject`).then(unwrap),
};

// ─────────────────────────────────────────────────────────────────────────────
//  ISSUES
//  Used by: HomeScreen, IssuesScreen
// ─────────────────────────────────────────────────────────────────────────────
export const issuesApi = {
  getAll:     (params = {}) => client.get("/issues", { params }).then(unwrap),
  getOne:     (id)          => client.get(`/issues/${id}`).then(unwrap),
  create:     (payload)     => client.post("/issues", payload).then(unwrap),
  update:     (id, payload) => client.patch(`/issues/${id}`, payload).then(unwrap),
  addComment: (id, body)    => client.post(`/issues/${id}/comments`, { body }).then(unwrap),

  // Photo upload — multipart/form-data, field name: "photo"
  uploadPhoto: (id, file) => {
    const fd = new FormData();
    fd.append("photo", file);
    return client.post(`/issues/${id}/photos`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(unwrap);
  },

  // Admin — assign external vendor
  assignVendor: (id, payload) => client.patch(`/issues/${id}/vendor`, payload).then(unwrap),
};

// ─────────────────────────────────────────────────────────────────────────────
//  HELP (Community Help posts)
//  Used by: HomeScreen, ResourceScreens (HelpScreen)
// ─────────────────────────────────────────────────────────────────────────────
export const helpApi = {
  getAll:      (params = {}) => client.get("/help", { params }).then(unwrap),
  getOne:      (id)          => client.get(`/help/${id}`).then(unwrap),
  create:      (payload)     => client.post("/help", payload).then(unwrap),
  addReply:    (id, payload) => client.post(`/help/${id}/replies`, payload).then(unwrap),
  upvoteReply: (id, replyId) => client.post(`/help/${id}/replies/${replyId}/upvote`).then(unwrap),
  closePost:   (id)          => client.patch(`/help/${id}/close`).then(unwrap),
};

// ─────────────────────────────────────────────────────────────────────────────
//  NOTICES
//  Used by: HomeScreen, ResourceScreens (NoticesScreen)
// ─────────────────────────────────────────────────────────────────────────────
export const noticesApi = {
  getAll:    (params = {}) => client.get("/notices", { params }).then(unwrap),
  create:    (payload)     => client.post("/notices", payload).then(unwrap),
  setPinned: (id, isPinned)=> client.patch(`/notices/${id}/pin`, { isPinned }).then(unwrap),
  remove:    (id)          => client.delete(`/notices/${id}`).then(unwrap),
};

// ─────────────────────────────────────────────────────────────────────────────
//  POLLS
//  Used by: ResourceScreens (PollsScreen)
// ─────────────────────────────────────────────────────────────────────────────
export const pollsApi = {
  getAll:  (params = {}) => client.get("/polls", { params }).then(unwrap),
  create:  (payload)     => client.post("/polls", payload).then(unwrap),
  vote:    (id, optionId)=> client.post(`/polls/${id}/vote`, { optionId }).then(unwrap),
  closePoll: (id)        => client.patch(`/polls/${id}/close`).then(unwrap),
};

// ─────────────────────────────────────────────────────────────────────────────
//  CONTACTS
//  Used by: ResourceScreens (ContactsScreen)
// ─────────────────────────────────────────────────────────────────────────────
export const contactsApi = {
  getAll:  ()            => client.get("/contacts").then(unwrap),
  create:  (payload)     => client.post("/contacts", payload).then(unwrap),
  update:  (id, payload) => client.patch(`/contacts/${id}`, payload).then(unwrap),
  remove:  (id)          => client.delete(`/contacts/${id}`).then(unwrap),
};

// ─────────────────────────────────────────────────────────────────────────────
//  VISITORS
//  Used by: VisitorScreen
//  NOTE: exported as `visitorApi` (no 's') to match what VisitorScreen imports
// ─────────────────────────────────────────────────────────────────────────────
export const visitorApi = {
  // Resident — pre-approved invite (returns OTP once)
  createInvite:  (payload) => client.post("/visitors/invite", payload).then(unwrap),

  // Resident — own visitor history
  getMyVisitors: (params = {}) => client.get("/visitors/mine", { params }).then(unwrap),

  // Resident — approve / reject a walk-in
  approveWalkIn: (id) => client.patch(`/visitors/${id}/approve`).then(unwrap),
  rejectWalkIn:  (id) => client.patch(`/visitors/${id}/reject`).then(unwrap),

  // GAP-5 FIX: Resident cancels a pre-approved invite before visitor arrives.
  // Invalidates the OTP; sets status → "expired".
  cancelInvite:  (id) => client.patch(`/visitors/${id}/cancel`).then(unwrap),

  // Admin / Security — log walk-in, verify OTP, mark exit
  logWalkIn:   (payload) => client.post("/visitors/walk-in", payload).then(unwrap),
  verifyOTP:   (id, otp) => client.post(`/visitors/${id}/verify-otp`, { otp }).then(unwrap),
  markExit:    (id)      => client.patch(`/visitors/${id}/exit`).then(unwrap),

  // Admin / Security — all visitors list
  getAll:  (params = {}) => client.get("/visitors", { params }).then(unwrap),
  getOne:  (id)          => client.get(`/visitors/${id}`).then(unwrap),
};

// ─────────────────────────────────────────────────────────────────────────────
//  AMENITIES + BOOKINGS
//  Used by: AmenityScreen
//  NOTE: exported as `amenityApi` (no 'ies') to match what AmenityScreen imports
// ─────────────────────────────────────────────────────────────────────────────
export const amenityApi = {
  // Amenity CRUD (admin)
  create:      (payload)     => client.post("/amenities", payload).then(unwrap),
  update:      (id, payload) => client.patch(`/amenities/${id}`, payload).then(unwrap),
  deactivate:  (id)          => client.delete(`/amenities/${id}`).then(unwrap),

  // Listing (both roles)
  getAll:      (params = {}) => client.get("/amenities", { params }).then(unwrap),
  getOne:      (id)          => client.get(`/amenities/${id}`).then(unwrap),

  // Slot availability — ?date=YYYY-MM-DD
  getAvailability: (id, date) =>
    client.get(`/amenities/${id}/availability`, { params: { date } }).then(unwrap),

  // Bookings
  createBooking:  (payload)    => client.post("/amenities/bookings", payload).then(unwrap),
  getMyBookings:  (params = {})=> client.get("/amenities/bookings/mine", { params }).then(unwrap),
  getAllBookings:  (params = {})=> client.get("/amenities/bookings/all", { params }).then(unwrap),
  getBooking:     (bookingId)  => client.get(`/amenities/bookings/${bookingId}`).then(unwrap),
  cancelBooking:  (bookingId, reason) =>
    client.patch(`/amenities/bookings/${bookingId}/cancel`, { reason }).then(unwrap),

  // Admin booking actions
  confirmBooking: (bookingId, adminNote) =>
    client.patch(`/amenities/bookings/${bookingId}/confirm`, { adminNote }).then(unwrap),
  rejectBooking:  (bookingId, adminNote) =>
    client.patch(`/amenities/bookings/${bookingId}/reject`, { adminNote }).then(unwrap),
};

// ─────────────────────────────────────────────────────────────────────────────
//  EVENTS + RSVP
//  Used by: EventsScreen, AttendeeList
// ─────────────────────────────────────────────────────────────────────────────
export const eventsApi = {
  // Listing (residents see published only)
  getAll:  (params = {}) => client.get("/events", { params }).then(unwrap),
  getOne:  (id)          => client.get(`/events/${id}`).then(unwrap),

  // RSVP — payload: { status: "going"|"maybe"|"not_going", guestCount?, note? }
  rsvp:       (id, payload) => client.post(`/events/${id}/rsvp`, payload).then(unwrap),
  removeRsvp: (id)          => client.delete(`/events/${id}/rsvp`).then(unwrap),

  // Admin only
  create:  (payload)     => client.post("/events", payload).then(unwrap),
  update:  (id, payload) => client.patch(`/events/${id}`, payload).then(unwrap),
  publish: (id)          => client.patch(`/events/${id}/publish`).then(unwrap),
  cancel:  (id, reason)  => client.patch(`/events/${id}/cancel`, { reason }).then(unwrap),
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAINTENANCE / BILLS + PAYMENTS
//  Used by: MaintenanceScreen, DefaulterList, ResidentPaymentCard
// ─────────────────────────────────────────────────────────────────────────────
export const maintenanceApi = {
  // Bills — both roles (residents see published only)
  getAllBills:  (params = {}) => client.get("/maintenance", { params }).then(unwrap),
  getBillById: (id)           => client.get(`/maintenance/${id}`).then(unwrap),

  // Resident — own payment history across all bills
  getMyPayments: (params = {}) => client.get("/maintenance/my-payments", { params }).then(unwrap),

  // Admin — bill lifecycle
  createBill:  (payload)     => client.post("/maintenance", payload).then(unwrap),
  updateBill:  (id, payload) => client.patch(`/maintenance/${id}`, payload).then(unwrap),
  publishBill: (id)          => client.patch(`/maintenance/${id}/publish`).then(unwrap),
  closeBill:   (id)          => client.patch(`/maintenance/${id}/close`).then(unwrap),

  // Admin — payment record actions (billId + paymentId from payments sub-array)
  recordPayment:  (billId, paymentId, payload) =>
    client.patch(`/maintenance/${billId}/payments/${paymentId}`, payload).then(unwrap),
  applyDiscount:  (billId, paymentId, discount) =>
    client.patch(`/maintenance/${billId}/payments/${paymentId}/discount`, { discount }).then(unwrap),
  applyPenalty:   (billId) =>
    client.patch(`/maintenance/${billId}/apply-penalty`).then(unwrap),
};

// ─────────────────────────────────────────────────────────────────────────────
//  PARKING — SLOTS + REQUESTS
//  Used by: ParkingScreen, SlotList, SlotSummary, RequestForm, MyRequests, AdminRequests, CreateSlotForm
// ─────────────────────────────────────────────────────────────────────────────
export const parkingApi = {
  // Slots — both roles
  getSummary: ()            => client.get("/parking/slots/summary").then(unwrap),
  getSlots:   (params = {}) => client.get("/parking/slots", { params }).then(unwrap),

  // Slots — admin
  createSlot:  (payload) => client.post("/parking/slots", payload).then(unwrap),
  bulkCreate:  (payload) => client.post("/parking/slots/bulk", payload).then(unwrap),
  releaseSlot: (id)      => client.patch(`/parking/slots/${id}/release`).then(unwrap),

  // Requests — resident
  submitRequest: (payload)     => client.post("/parking/requests", payload).then(unwrap),
  getMyRequests: (params = {}) => client.get("/parking/requests/mine", { params }).then(unwrap),
  cancelRequest: (id)          => client.patch(`/parking/requests/${id}/cancel`).then(unwrap),

  // Requests — admin
  getAllRequests:  (params = {}) => client.get("/parking/requests", { params }).then(unwrap),
  approveRequest: (id, slotId)  =>
    client.patch(`/parking/requests/${id}/approve`, slotId ? { slotId } : {}).then(unwrap),
  rejectRequest:  (id, note)    =>
    client.patch(`/parking/requests/${id}/reject`, { adminNote: note }).then(unwrap),
};
