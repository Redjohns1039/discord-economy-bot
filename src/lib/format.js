function formatMoney(amount) {
  return new Intl.NumberFormat("tr-TR").format(amount);
}

module.exports = {
  formatMoney
};
