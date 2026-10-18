using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TeslaMuseum.Application.Abstractions;
using TeslaMuseum.Infrastructure.Persistence;
using TeslaMuseum.Infrastructure.Repositories;

namespace TeslaMuseum.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<TeslaMuseumDbContext>(options =>
            options.UseSqlite(configuration.GetConnectionString("TeslaMuseum")));
        services.AddScoped<IExhibitRepository, ExhibitRepository>();
        services.AddScoped<IHotspotRepository, HotspotRepository>();
        return services;
    }
}
