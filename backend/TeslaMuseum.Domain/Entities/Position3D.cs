namespace TeslaMuseum.Domain.Entities;

public sealed class Position3D
{
    private Position3D()
    {
    }

    public Position3D(double x, double y, double z)
    {
        X = x;
        Y = y;
        Z = z;
    }

    public double X { get; private set; }
    public double Y { get; private set; }
    public double Z { get; private set; }

    public void Update(double x, double y, double z)
    {
        X = x;
        Y = y;
        Z = z;
    }
}
