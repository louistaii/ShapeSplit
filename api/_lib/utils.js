class Counter {
    constructor(iterable = []) {
        this.counts = {};
        if (iterable) {
            for (const item of iterable) {
                this.counts[item] = (this.counts[item] || 0) + 1;
            }
        }
    }

    get(item) {
        return this.counts[item] || 0;
    }

    set(item, count) {
        this.counts[item] = count;
    }

    add(item, count = 1) {
        this.counts[item] = (this.counts[item] || 0) + count;
    }

    mostCommon(n = null) {
        const entries = Object.entries(this.counts)
            .sort(([,a], [,b]) => b - a);
        return n ? entries.slice(0, n) : entries;
    }

    keys() {
        return Object.keys(this.counts);
    }

    values() {
        return Object.values(this.counts);
    }

    items() {
        return Object.entries(this.counts);
    }

    total() {
        return Object.values(this.counts).reduce((sum, count) => sum + count, 0);
    }
}

module.exports = { Counter };
