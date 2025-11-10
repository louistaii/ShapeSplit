// Vercel Serverless Function
module.exports = async (req, res) => {
    res.status(200).json({
        regions: [
            { value: 'na1', label: 'North America', routing: 'americas' },
            { value: 'euw1', label: 'Europe West', routing: 'europe' },
            { value: 'eun1', label: 'Europe Nordic & East', routing: 'europe' },
            { value: 'kr', label: 'Korea', routing: 'asia' },
            { value: 'jp1', label: 'Japan', routing: 'asia' },
            { value: 'br1', label: 'Brazil', routing: 'americas' },
            { value: 'la1', label: 'Latin America North', routing: 'americas' },
            { value: 'la2', label: 'Latin America South', routing: 'americas' },
            { value: 'oc1', label: 'Oceania', routing: 'sea' },
            { value: 'tr1', label: 'Turkey', routing: 'europe' },
            { value: 'ru', label: 'Russia', routing: 'europe' },
            { value: 'ph2', label: 'Philippines', routing: 'sea' },
            { value: 'sg2', label: 'Singapore', routing: 'sea' },
            { value: 'th2', label: 'Thailand', routing: 'sea' },
            { value: 'tw2', label: 'Taiwan', routing: 'sea' },
            { value: 'vn2', label: 'Vietnam', routing: 'sea' }
        ]
    });
};
